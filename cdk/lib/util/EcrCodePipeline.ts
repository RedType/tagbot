import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DeploymentStage, GithubRepository } from '../types';

import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export interface EcrCodePipelineProps extends cdk.StackProps {
  readonly repository: GithubRepository;
  readonly stage: DeploymentStage;
  readonly additionalBuildEnv?: Record<string, string>;
  readonly additionalBuildSecrets?: Record<string, string>;
}

export default class EcrCodePipeline extends cdk.Stack {
  protected readonly pipeline: codepipeline.Pipeline;
  protected readonly source: codepipeline.Artifact;
  protected readonly build: codepipeline.Artifact;
  public readonly outputEcr: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrCodePipelineProps) {
    super(scope, id, props);

    const account = props.env?.account || this.account;
    const region = props.env?.region || this.region;
    const repo = GithubRepository.parse(props.repository);
    const stage = DeploymentStage.parse(props.stage);
    const [ownerName, repoName] = repo.name.split('/');

    this.pipeline = new codepipeline.Pipeline(this, 'Pipeline');
    this.source = new codepipeline.Artifact();
    this.build = new codepipeline.Artifact();
    this.outputEcr = new ecr.Repository(this, 'EcrRepository');

    // source stage

    this.pipeline.addStage({
      stageName: 'source',
      actions: [
        // by default this is automatically triggered via webhook on branch commit
        new codepipelineActions.GitHubSourceAction({
          actionName: 'source',
          owner: ownerName,
          repo: repoName,
          branch: repo.branch || `deploy/${stage}`,
          oauthToken: repo.secret,
          output: this.source,
        })
      ],
    });

    /////////////////
    // build stage //
    /////////////////

    const buildEnv = {
      STAGE: { value: stage },
      ECR_REPOSITORY_URI: { value: this.outputEcr.repositoryUri },
    };

    if (props.additionalBuildEnv) {
      Object.entries(props.additionalBuildEnv).forEach(([key, val]) =>
        Object.assign(buildEnv, { [key]: { value: val } })
      );
    }

    // turn the build env variables into build-arg variables
    // so they can be passed to the docker build
    // (WARNING: DON'T PASS SECRETS TO ENV THIS WAY)
    // (It's okay to pass secrets as build args, but
    //  don't forward them to ENV in your Dockerfile)
    const buildArgs = Object.entries(buildEnv)
      .map(([k, v]) => `--build-arg=${k}="${v.value}"`)
      // add in secret forwarding
      .concat(Object.keys(props.additionalBuildSecrets ?? {})
        .map(k => `--build-arg=${k}="$${k}"`)
      )
      .join(' ')
    ;

    const fetchSecretsCommands = Object.entries(props.additionalBuildSecrets ?? {})
      .map(([secretEnvKey, secretId]) =>
        `${secretEnvKey}="$(` +
          // fetch secret
          `aws secretsmanager get-secret-value --secret-id ${secretId}` +
          // extract secret string from json response
          ' | jq .SecretString' +
          // hack away the quotes around it
          ' | xargs echo' +
        ')"'
      )
    ;

    const project = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: true,
        environmentVariables: buildEnv,
      },
      // to capture a variable from the build, see the example at
      // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_codebuild.BuildSpec.html
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              repo.path ? `cd ${repo.path}` : '',
            ].filter(c => !!c),
          },
          pre_build: {
            commands: [
              // ensure aws is available
              'aws --version',
              // log in to ecr so we can push image
              `aws ecr get-login-password --region "${region}"`
                + ' | docker login --username AWS --password-stdin'
                + `   "${account}.dkr.ecr.${region}.amazonaws.com"`
              ,
              // export secrets to build env
              ...fetchSecretsCommands,
              // tag docker image with the beginning of the commit hash
              'COMMIT_HASH="$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)"',
              'IMAGE_TAG="${COMMIT_HASH:=latest}"',
            ],
          },
          build: {
            commands: [
              `docker build -t "$ECR_REPOSITORY_URI:latest" ${buildArgs} .`,
              'docker tag "$ECR_REPOSITORY_URI:latest" "$REPOSITORY_URI:$IMAGE_TAG"',
            ],
          },
          post_build: {
            commands: [
              'docker push "$ECR_REPOSITORY_URI:latest"',
              'docker push "$ECR_REPOSITORY_URI:$IMAGE_TAG"',
            ],
          },
        },
      }),
    });

    // grant the build project permission to push to the repository
    this.outputEcr.grantPullPush(project.grantPrincipal);

    this.pipeline.addStage({
      stageName: 'build',
      actions: [
        new codepipelineActions.CodeBuildAction({
          project,
          actionName: 'build',
          input: this.source,
        }),
      ],
    });
  }
}

