import {
  App,
  AppOptions,
  AwsLambdaReceiver,
  LogLevel,
} from '@slack/bolt';
import { ConversationsHistoryResponse } from "@slack/web-api/dist/response";
import { Message } from "@slack/web-api/dist/response/ConversationsHistoryResponse";
import { DynamoDB } from 'aws-sdk';
import {
  isReactionAddedEvent,
  isMessageItem,
  isReactionRemovedEvent
} from './helpers';

// Initialize your custom receiver
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
});

// Initializes your app with your bot token and the AWS Lambda ready receiver
const appArgs: AppOptions = { token: process.env.SLACK_BOT_TOKEN ?? "" };
if (process.env.IS_LOCAL === "true") {
  appArgs.signingSecret = process.env.SLACK_SIGNING_SECRET
  appArgs.logLevel = LogLevel.DEBUG
} else {
  appArgs.receiver = awsLambdaReceiver
  appArgs.processBeforeResponse = true
}
const app = new App(appArgs);

app.event('reaction_added', async ({ event, client }) => {
  if (!isReactionAddedEvent(event)) return;
  if (!isMessageItem(event.item)) return;

  const channel = event.item.channel
  const dynamo = new DynamoDB.DocumentClient();
  if (event.reaction.match(/.*remind_[0-9]+_[mh]$/)) {
    const result: ConversationsHistoryResponse = await client.conversations.history({
      channel: channel,
      latest: event.item.ts,
      inclusive: true, // Limit the results to only one
      limit: 1
    });
    // There should only be one result (stored in the zeroth index)
    const message: Message | undefined = result.messages?.[0];
    if (!message || !message.text) return;

    const mention_user_names = message.text.match(/<@[^\s]+>/g);
    if (!mention_user_names) return;

    // DynamoDB
    const now = (new Date()).getTime();
    for (const mention_user_name of mention_user_names) {
      await dynamo
        .put({
          TableName: process.env.REMINDER_TABLE_NAME ?? "",
          Item: {
            "MentionedUser": mention_user_name.slice(2, -1),
            "ChannelAndMessageTs": `${channel}_${event.item.ts}`,
            "LastRemindedAt": now,
            "MessageLink": `https://${process.env.SLACK_WORKSPACE}.slack.com/archives/${channel}/p${event.item.ts.replace(/\./g, "")}`,
            "ReactionUser": event.user,
            "IsFinished": "false",
            "Reaction": event.reaction
          }
        })
        .promise()
    }
  } else if (event.reaction.match(/remind_finish/)) {
    // when finish reaction added
    const result: ConversationsHistoryResponse = await client.conversations.history({
      channel: channel,
      latest: event.item.ts,
      inclusive: true, // Limit the results to only one
      limit: 1
    });

    await dynamo.update({
      TableName: process.env.REMINDER_TABLE_NAME ?? "",
      Key: {
        "MentionedUser": event.user,
        "ChannelAndMessageTs": `${channel}_${event.item.ts}`
      },
      UpdateExpression: "set IsFinished = :if",
      ExpressionAttributeValues: {
        ":if": "true"
      },
      ReturnValues: "UPDATED_NEW"
    }).promise();
  }
});

app.event('reaction_removed', async ({ event, client }) => {
  if (!isReactionRemovedEvent(event)) return;
  if (!isMessageItem(event.item)) return;

  if (event.reaction.match(/.*remind_[0-9]+_[mh]$/)) {
    const channel = event.item.channel
    const result: ConversationsHistoryResponse = await client.conversations.history({
      channel: channel,
      latest: event.item.ts,
      inclusive: true, // Limit the results to only one
      limit: 1
    });
    // There should only be one result (stored in the zeroth index)
    const message: Message | undefined = result.messages?.[0];
    if (!message || !message.text || !message.ts) return;

    const mention_user_names = message.text.match(/<@[^\s]+>/g);
    if (!mention_user_names) return;

    // DynamoDB
    const dynamo = new DynamoDB.DocumentClient();
    for (const mention_user_name of mention_user_names) {
      await dynamo
        .delete({
          TableName: process.env.REMINDER_TABLE_NAME ?? "",
          Key: {
            "MentionedUser": mention_user_name.slice(2, -1),
            "ChannelAndMessageTs": `${channel}_${message.ts}`
          }
        })
        .promise()
    }
  }
});

// Listens to incoming messages that contain "goodbye"
app.message('goodbye', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say(`See ya later, <@${(message as any).user}> :wave:`);
});

// Handle the Lambda function event
export const handler = async (event: any, context: any, callback: any) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
}

if (process.env.IS_LOCAL === "true") {
  (async () => {
    // Start your app

    await app.start(3000);

    console.log('⚡️ Bolt app is running!');
  })();
}
