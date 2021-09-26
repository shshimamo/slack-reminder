import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { NODE_LAMBDA_LAYER_DIR } from './process/setup';

export interface CronReminderProps {
  /** the function for which we want to count url hits **/
  table: dynamodb.Table;
}

export class CronReminder extends cdk.Construct {

  public readonly handler: lambda.Function;

  constructor(scope: cdk.Construct, id: string, props: CronReminderProps) {
    super(scope, id);

    // TODO: layerを分ける
    const nodeModulesLayer = new lambda.LayerVersion(this, 'NodeModulesLayer',
      {
        code: lambda.AssetCode.fromAsset(NODE_LAMBDA_LAYER_DIR),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X]
      }
    );

    this.handler = new lambda.Function(this, "appLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lib/lambda-handlers/cron-reminder'),
      handler: "cron-reminder.handler",
      layers: [nodeModulesLayer],
      environment: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "",
        SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || "",
        REMINDER_TABLE_NAME: props.table?.tableName || ""
      },
    });

    props.table?.grantReadWriteData(this.handler);
  }
}
