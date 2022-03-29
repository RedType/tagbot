import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { GithubRepository } from './types';

import * as pipelines from 'aws-cdk-lib/pipelines';

interface PipelineProps extends cdk.StackProps {
  readonly repository: GithubRepository;
}

export default class CdkPipeline extends cdk.Stack {
  public readonly pipeline: pipelines.CodePipeline;

  constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id, props);

    const repo = GithubRepository.parse(props.repository);

    this.pipeline = new pipelines.CodePipeline(this, 'CdkPipeline', {
      synth: new pipelines.ShellStep('Synth', {
        input: pipelines.CodePipelineSource.gitHub(repo.name, repo.branch || 'deploy', {
          authentication: repo.secret,
        }),
        commands: [
          repo.path ? `cd ${repo.path}` : '',
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ].filter(c => !!c),
        primaryOutputDirectory: repo.path ? `${repo.path}/cdk.out` : undefined,
      }),
    });
  }
}

