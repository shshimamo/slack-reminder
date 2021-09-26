import {
  ReactionAddedEvent,
  ReactionRemovedEvent,
  ReactionMessageItem,
  SlackEvent
} from '@slack/bolt';

export const isReactionAddedEvent = (event: SlackEvent):
  event is ReactionAddedEvent => (event as ReactionAddedEvent).type === 'reaction_added';

export const isReactionRemovedEvent = (event: SlackEvent):
  event is ReactionRemovedEvent => (event as ReactionRemovedEvent).type === 'reaction_removed';

export const isMessageItem = (item: ReactionAddedEvent['item'] | ReactionRemovedEvent['item']):
  item is ReactionMessageItem => (item as ReactionMessageItem).type === 'message';
