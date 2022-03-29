import { z } from 'zod';

import * as cdk from 'aws-cdk-lib';

export const DeploymentStage = z.enum([
  'prod',
  'dev',
]);
export type DeploymentStage = z.infer<typeof DeploymentStage>;

export const SecretValue: z.ZodType<cdk.SecretValue> = z.any().refine(
  sv => sv instanceof cdk.SecretValue,
  { message: 'Object must be a cdk.SecretValue' },
);
export type SecretValue = z.infer<typeof SecretValue>;

export const GithubRepository = z.object({
  name: z.string().regex(/.+\/.+/,
    'A Github repository name must follow the pattern "<account_name>/<repository_name>"',
  ),
  branch: z.string().optional(),
  path: z.string().optional(),
  secret: SecretValue,
});
export type GithubRepository = z.infer<typeof GithubRepository>;

