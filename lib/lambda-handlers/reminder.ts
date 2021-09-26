import {
  App,
  AppOptions,
  AwsLambdaReceiver,
  SayArguments,
  LogLevel,
  ReactionAddedEvent,
  ReactionMessageItem,
  SlackEvent
} from '@slack/bolt';
import { ConversationsHistoryResponse } from "@slack/web-api/dist/response";
import { Message } from "@slack/web-api/dist/response/ConversationsHistoryResponse";
import { DynamoDB } from 'aws-sdk';

export const isReactionAddedEvent = (event: SlackEvent):
  event is ReactionAddedEvent => (event as ReactionAddedEvent).type === 'reaction_added';

const isMessageItem = (item: ReactionAddedEvent['item']):
  item is ReactionMessageItem => (item as ReactionMessageItem).type === 'message';

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
let app = new App(appArgs);

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `Hey there <@${(message as any).user}>!`
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Click Me"
          },
          "action_id": "button_click"
        }
      }
    ],
    text: `Hey there <@${(message as any).user}>!`
  } as SayArguments);
});

// Listens for an action from a button click
app.action('button_click', async ({ body, ack, say }) => {
  await say(`<@${body.user.id}> clicked the button`);

  // Acknowledge the action after say() to exit the Lambda process
  await ack();
});

app.event('reaction_added', async ({ event, client }) => {
  if (!isReactionAddedEvent(event)) return;
  if (!isMessageItem(event.item)) return;
  console.log('event', event)

  if (event.reaction.match(/remind_[0-9]+_[mh]/)) {
    const channel = event.item.channel
    const result: ConversationsHistoryResponse = await client.conversations.history({
      channel: channel,
      latest: event.item.ts,
      inclusive: true, // Limit the results to only one
      limit: 1
    });
    // There should only be one result (stored in the zeroth index)
    const message: Message | undefined = result.messages?.[0];
    console.log('message:', message);
    if (!message || !message.text || !message.ts) return;

    const mention_user_names = message.text.match(/@[^\s]+/g);
    if (!mention_user_names) return;

    // DynamoDB
    const now = (new Date()).getTime();
    const dynamo = new DynamoDB();
    for (const mention_user_name of mention_user_names) {
      await dynamo
        .putItem({
          TableName: "SlackReminder",
          Item: {
          // Item: {
            "MentionedUser": {
              "S": mention_user_name.slice(1)
            },
            "ChannelMessageTs": {
              "S": `${channel}_${message.ts}`
            },
            "LastRemindedAt": {
              "N": String(now)// 初回も入れておく
            },
            "MessageLink": {
              "S": `https://${process.env.SLACK_WORKSPACE}.slack.com/archives/${channel}/p${message.ts.replace(/\./g, "")}`
            },
            "ReactionUser": {
              "S": event.user
            },
            "IsFinished": {
              "S": "false"
            },
            "IsHurry": {
              "S": 'false'
            }
          }
        })
        .promise();
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
