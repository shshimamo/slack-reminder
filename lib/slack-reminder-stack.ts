import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigateway from "@aws-cdk/aws-apigateway";

const NODE_LAMBDA_LAYER_DIR = `${process.cwd()}/bundle`;

export class SlackReminderStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const nodeModulesLayer = new lambda.LayerVersion(this, 'NodeModulesLayer',
      {
        code: lambda.AssetCode.fromAsset(NODE_LAMBDA_LAYER_DIR),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X]
      }
    );

    const appLambda = new lambda.Function(this, "appLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lib/lambda-handlers'),
      handler: "reminder.handler",
      layers: [nodeModulesLayer],
      environment: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "",
        SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || "",
      },
    });

    const api = new apigateway.LambdaRestApi(this, "slackApi", {
      handler: appLambda,
      proxy: false
    });
    const slack = api.root.addResource('slack');
    const events = slack.addResource('events');
    events.addMethod('POST');
  }
}
