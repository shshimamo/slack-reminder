import {
  AppOptions,
  AwsLambdaReceiver,
  LogLevel,
  ReactionAddedEvent,
  ReactionMessageItem,
  ReactionRemovedEvent,
  SlackEvent
} from '@slack/bolt';
import { ConversationsHistoryResponse } from "@slack/web-api/dist/response";
import { WebClient } from '@slack/web-api'

export const isReactionAddedEvent = (event: SlackEvent):
  event is ReactionAddedEvent => (event as ReactionAddedEvent).type === 'reaction_added';

export const isReactionRemovedEvent = (event: SlackEvent):
  event is ReactionRemovedEvent => (event as ReactionRemovedEvent).type === 'reaction_removed';

export const isMessageItem = (item: ReactionAddedEvent['item'] | ReactionRemovedEvent['item']):
  item is ReactionMessageItem => (item as ReactionMessageItem).type === 'message';

export const getConversionsHistory = async (channel: string, ts: string, client: WebClient):
  Promise<ConversationsHistoryResponse> => {
  return await client.conversations.history({
    channel: channel,
    latest: ts,
    inclusive: true, // Limit the results to only one
    limit: 1
  });
}

export const slackAppOptions = (awsLambdaReceiver: AwsLambdaReceiver):
  AppOptions => {
  if (process.env.IS_LOCAL === "true") {
    return {
      token: process.env.SLACK_BOT_TOKEN ?? "",
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      logLevel: LogLevel.DEBUG
    }
  }
  return {
    token: process.env.SLACK_BOT_TOKEN ?? "",
    receiver: awsLambdaReceiver,
    processBeforeResponse: true
  }
}
