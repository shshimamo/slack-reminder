import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB.DocumentClient();

exports.handler = async (event: any, context: any) => {
  let body = "";
  let statusCode = 200;
  const headers = { "Content-Type": "application/json" };
  const now = (new Date()).getTime();

  try {
    const params = {
      ExpressionAttributeValues: {
        ':mun': 'UQLE60H1C' // me
      },
      KeyConditionExpression: 'MentionedUser = :mun',
      TableName: process.env.REMINDER_TABLE_NAME ?? ""
    };
    const res = await dynamo.query(params).promise();

    console.log("[DynamoDB] res", res)
    if (!res?.Items || !Array.isArray(res.Items)) {
      body = 'No items found'
      return { statusCode, body, headers };
    }

    const reminders = res.Items.filter(item => {
      const diff = now - item.LastRemindedAt
      return diff > 1 // テスト
      // if (item.is_hurry === 'true') {
      //   return diff > 1 * 60 * 60 * 1000 // 急ぎは1時間経ったら通知
      // } else {
      //   return diff > 12 * 60 * 60 * 1000 // 通常は12時間
      // }
    });

    for (const item of reminders) {
      const params = {
        TableName: process.env.REMINDER_TABLE_NAME ?? "",
        Key:{
          MentionedUser: item.MentionedUser,
          ChannelAndMessageTs: item.ChannelAndMessageTs,
        },
        UpdateExpression: "set LastRemindedAt = :lra",
        ExpressionAttributeValues:{
          ":lra": now
        },
        ReturnValues:"UPDATED_NEW"
      };
      await dynamo.update(params).promise();
    }

    // TODO: Slack DM

    body = JSON.stringify(reminders);
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
