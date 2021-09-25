import * as cdk from '@aws-cdk/core';
import * as apigateway from "@aws-cdk/aws-apigateway";
import { Reminder } from './reminder';

export class SlackReminderStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const reminder = new Reminder(this, 'Reminder');

    const api = new apigateway.LambdaRestApi(this, "slackReminderBot", {
      handler: reminder.handler,
      proxy: false
    });
    const slack = api.root.addResource('slack');
    const events = slack.addResource('events');
    events.addMethod('POST');
  }
}
