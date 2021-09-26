import {
  ReactionAddedEvent,
  ReactionMessageItem,
  SlackEvent
} from '@slack/bolt';

export const isReactionAddedEvent = (event: SlackEvent):
  event is ReactionAddedEvent => (event as ReactionAddedEvent).type === 'reaction_added';

export const isMessageItem = (item: ReactionAddedEvent['item']):
  item is ReactionMessageItem => (item as ReactionMessageItem).type === 'message';
