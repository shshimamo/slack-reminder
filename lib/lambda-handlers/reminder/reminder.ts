import { App, AwsLambdaReceiver } from '@slack/bolt';
import { ConversationsHistoryResponse } from "@slack/web-api/dist/response";
import { Message } from "@slack/web-api/dist/response/ConversationsHistoryResponse";
import { DynamoDB } from 'aws-sdk';
import * as helpers from './helpers';

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
});
const app = new App(helpers.slackAppOptions(awsLambdaReceiver));

app.event('reaction_added', async ({ event, client }) => {
  if (!helpers.isReactionAddedEvent(event)) return;
  if (!helpers.isMessageItem(event.item)) return;

  const channel = event.item.channel
  const ts = event.item.ts
  const dynamo = new DynamoDB.DocumentClient();

  if (event.reaction.match(/remind_finish/)) {
    // when finish reaction added
    await dynamo.update({
      TableName: process.env.REMINDER_TABLE_NAME ?? "",
      Key: {
        "MentionedUser": event.user,
        "ChannelAndMessageTs": `${channel}_${ts}`
      },
      UpdateExpression: "set IsFinished = :if",
      ExpressionAttributeValues: {
        ":if": "true"
      },
      ReturnValues: "UPDATED_NEW"
    }).promise();
    return
  }

  if (event.reaction.match(/.*remind_[0-9]+_[mh]$/)) {
    const conversation: ConversationsHistoryResponse = await helpers.getConversionsHistory(channel, ts, client);

    const message: Message | undefined = conversation.messages?.[0];
    if (!message?.text) return;

    const mention_user_names = message.text.match(/<@[^\s]+>/g);
    if (!mention_user_names) return;

    const now = (new Date()).getTime();
    for (const mention_user_name of mention_user_names) {
      await dynamo
        .put({
          TableName: process.env.REMINDER_TABLE_NAME ?? "",
          Item: {
            "MentionedUser": mention_user_name.slice(2, -1),
            "ChannelAndMessageTs": `${channel}_${ts}`,
            "LastRemindedAt": now,
            "MessageLink": `https://${process.env.SLACK_WORKSPACE}.slack.com/archives/${channel}/p${ts.replace(/\./g, "")}`,
            "ReactionUser": event.user,
            "IsFinished": "false",
            "Reaction": event.reaction
          }
        })
        .promise()
    }
  }
});

app.event('reaction_removed', async ({ event, client }) => {
  if (!helpers.isReactionRemovedEvent(event)) return;
  if (!helpers.isMessageItem(event.item)) return;

  if (!event.reaction.match(/.*remind_[0-9]+_[mh]$/)) return;

  const channel = event.item.channel
  const ts = event.item.ts
  const conversation: ConversationsHistoryResponse = await helpers.getConversionsHistory(channel, ts, client);
  const message: Message | undefined = conversation.messages?.[0];
  if (!message?.text) return;

  const mention_user_names = message.text.match(/<@[^\s]+>/g);
  if (!mention_user_names) return;

  const dynamo = new DynamoDB.DocumentClient();
  for (const mention_user_name of mention_user_names) {
    await dynamo
      .delete({
        TableName: process.env.REMINDER_TABLE_NAME ?? "",
        Key: {
          "MentionedUser": mention_user_name.slice(2, -1),
          "ChannelAndMessageTs": `${channel}_${ts}`
        }
      })
      .promise()
  }
});

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
