import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { DeploymentStage } from '../lib/types';

import * as pipelines from 'aws-cdk-lib/pipelines';

import CdkPipeline from '../lib/CdkPipeline';
import TagbotStack from '../lib/TagbotStack';

const env = {
  account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();

/////////////////////////////////////////////////////////////////////
// Full Stack Definition                                           //
// (input stage-specific props in Deployment Stages section below) //
/////////////////////////////////////////////////////////////////////

interface StageSpecificProps extends cdk.StageProps {
  stage: DeploymentStage;
}

class App extends cdk.Stage {
  constructor(scope: Construct, props: StageSpecificProps) {
    super(scope, props.stage, props);

    const stage = DeploymentStage.parse(props.stage);

    new TagbotStack(this, 'TagbotStack', {
      stage,
      repository: {
        name: 'RedType/tagbot',
        branch: `deploy/${stage}`,
        path: 'handler',
        secret: cdk.SecretValue.secretsManager('github-token'),
      },
    });
  }
}

////////////////////////////////////////////////////////////
// CDK Code Pipeline & Stages                             // 
// (the thing that deploys changes to this app definiton) //
////////////////////////////////////////////////////////////

const pipes = new CdkPipeline(app, 'TagbotPipeline', {
  env,
  repository: {
    name: 'RedType/tagbot',
    branch: 'deploy/cdk',
    path: 'cdk',
    secret: cdk.SecretValue.secretsManager('github-token'),
  }
});

pipes.pipeline.addStage(new App(pipes, { env, stage: 'dev' }));
pipes.pipeline.addStage(new App(pipes, { env, stage: 'prod' }), {
  pre: [new pipelines.ManualApprovalStep('PromoteToProd')],
});

app.synth();

