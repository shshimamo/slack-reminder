import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';

const NODE_LAMBDA_LAYER_DIR = `${process.cwd()}/bundle`;

export class Reminder extends cdk.Construct {

  public readonly handler: lambda.Function;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const nodeModulesLayer = new lambda.LayerVersion(this, 'NodeModulesLayer',
      {
        code: lambda.AssetCode.fromAsset(NODE_LAMBDA_LAYER_DIR),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X]
      }
    );

    this.handler = new lambda.Function(this, "appLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lib/lambda-handlers'),
      handler: "reminder.handler",
      layers: [nodeModulesLayer],
      environment: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "",
        SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || "",
      },
    });
  }
}
