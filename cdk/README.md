# Tagbot CDK Deployment Infrastructure

This part of the repository describes the infrastructure for deploying Tagbot
to AWS.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run clean`   clean up the results of a build
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Secrets

The deployment expects you to have added some secrets to AWS Secrets Manager;
they are documented below:

* `github-token`    a github personal-access-token that has the scopes `repo`
                    and `admin:repo-hook`. This secret is not necessary if you
                    do not intent to use the CI/CD features of this stack (NYI)

## Environment Variables

To deploy this project, you have to have certain environment variables set:

* `AWS_ACCESS_KEY_ID`        your AWS account's api key id
* `AWS_SECRET_ACCESS_KEY`    your AWS account's api secret
* `CDK_DEPLOY_ACCOUNT`       your AWS account id
* `CDK_DEPLOY_REGION`        AWS region to deploy to

