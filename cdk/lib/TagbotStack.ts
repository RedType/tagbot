import { Construct } from 'constructs';
import { DeploymentStage, GithubRepository } from './types';
import EcrCodePipeline from './util/EcrCodePipeline';

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface TagbotStackProps extends cdk.StackProps {
  readonly stage: DeploymentStage;
  readonly repository: GithubRepository;
  readonly additionalBuildEnv?: Record<string, string>;
  readonly additionalBuildSecrets?: Record<string, string>;
  readonly noPipelineEcrOverride?: ecr.Repository;
}

export default class TagbotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TagbotStackProps) {
    super(scope, id, props);

    const stage = DeploymentStage.parse(props.stage);
    const repository = GithubRepository.parse(props.repository);

    const handlerEcr = props.noPipelineEcrOverride ??
      new EcrCodePipeline(this, 'BuildPipeline', {
        stage, repository,
        additionalBuildEnv: props.additionalBuildEnv,
        additionalBuildSecrets: props.additionalBuildSecrets,
      }).outputEcr
    ;

    const table = new dynamodb.Table(this, 'ConfigTable', {
      partitionKey: { name: 'part', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiHandler = new lambda.DockerImageFunction(this, 'ApiHandler', {
      description: 'Function that handles all api interactions',
      code: lambda.DockerImageCode.fromEcr(handlerEcr),
    });

    table.grantReadWriteData(apiHandler);
  }
}

