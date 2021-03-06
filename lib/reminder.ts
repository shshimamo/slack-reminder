import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { NODE_LAMBDA_LAYER_DIR } from './process/setup';

export class Reminder extends cdk.Construct {

  public readonly handler: lambda.Function;
  public readonly table: dynamodb.Table;

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, "SlackReminder", {
      partitionKey: {
        name: "MentionedUser",
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: "ChannelAndMessageTs",
        type: dynamodb.AttributeType.STRING
      }
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "IsFinished_index",
      partitionKey: {
        name: "IsFinished",
        type: dynamodb.AttributeType.STRING
      }
    });

    const nodeModulesLayer = new lambda.LayerVersion(this, 'NodeModulesLayer',
      {
        code: lambda.AssetCode.fromAsset(NODE_LAMBDA_LAYER_DIR),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X]
      }
    );

    this.handler = new lambda.Function(this, "appLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lib/lambda-handlers/reminder'),
      handler: "reminder.handler",
      layers: [nodeModulesLayer],
      environment: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "",
        SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || "",
        SLACK_WORKSPACE: process.env.SLACK_WORKSPACE || "",
        REMINDER_TABLE_NAME: this.table.tableName
      },
    });

    this.table.grantReadWriteData(this.handler);
  }
}
