import { App, AwsLambdaReceiver, SayArguments } from '@slack/bolt';

// Initialize your custom receiver
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
});

// Initializes your app with your bot token and the AWS Lambda ready receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN ?? "",
  receiver: awsLambdaReceiver,
  processBeforeResponse: true
});

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
