import { WebClient } from '@slack/web-api'
import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB.DocumentClient();

const web = new WebClient(process.env.SLACK_BOT_TOKEN ?? "")

export const handler = async (event: any, context: any) => {
  let body = "";
  let statusCode = 200;
  const headers = { "Content-Type": "application/json" };
  const now = (new Date()).getTime();

  try {
    const res = await dynamo.query({
      ExpressionAttributeValues: {
        ':if': "false"
      },
      KeyConditionExpression: 'IsFinished = :if',
      TableName: process.env.REMINDER_TABLE_NAME ?? "",
      IndexName: 'IsFinished_index'
    }).promise();

    if (!res?.Items || !Array.isArray(res.Items)) {
      body = 'No items found'
      return { statusCode, body, headers };
    }

    const items = res.Items.filter(item => now - item.LastRemindedAt > interval(item.Reaction));
    for (const item of items) {
      await dynamo.update({
        TableName: process.env.REMINDER_TABLE_NAME ?? "",
        Key: {
          MentionedUser: item.MentionedUser,
          ChannelAndMessageTs: item.ChannelAndMessageTs,
        },
        UpdateExpression: "set LastRemindedAt = :lra",
        ExpressionAttributeValues: {
          ":lra": now
        },
        ReturnValues: "UPDATED_NEW"
      }).promise();

      await web.chat.postMessage({
        text: `${(humanInterval(item.Reaction))}間隔で通知しています。${item.MessageLink}`,
        channel: item.MentionedUser,
      });
    }

    body = 'Success';
  } catch (err) {
    statusCode = 400;
    body = err.message;
  }

  return {
    statusCode,
    body,
    headers
  };
};

const interval = (reaction: string) => {
  if (reaction.match(/.*_[0-9]+_m$/)) {
    return Number(reaction.split('_').slice(-2)[0]) * 60 * 1000
  } else if (reaction.match(/.*_[0-9]+_h$/)) {
    return Number(reaction.split('_').slice(-2)[0]) * 60 * 60 * 1000
  } else {
    return 12 * 60 * 60 * 1000
  }
}

const humanInterval = (reaction: string) => {
  if (reaction.match(/.*_[0-9]+_m$/)) {
    return `${(reaction.split('_').slice(-2)[0])}分`
  } else if (reaction.match(/.*_[0-9]+_h$/)) {
    return `${(reaction.split('_').slice(-2)[0])}時間`
  } else {
    return '12時間'
  }
}
