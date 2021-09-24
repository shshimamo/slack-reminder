import * as cdk from '@aws-cdk/core';
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import * as apigateway from "@aws-cdk/aws-apigateway";

export class SlackReminderStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appLambda = new NodejsFunction(this, "appLambda", {
      entry: "src/lambda/handlers/app.ts",
      handler: "handler",
      environment: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "",
        SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || "",
      },
    });

    new apigateway.LambdaRestApi(this, "slackApi", {
      handler: appLambda,
    });
  }
}
