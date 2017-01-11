// Export the slackbots API with typings.

export type HelloMessage = { type: 'hello' };
export type ErrorMessage = { type: 'error', error: { code: number, message: string } };
export type MessageMessage = {
  type: 'message',
  subtype?: 'bot_message',
  bot_id?: string,
  channel: string,
  ts: string,
  user: string,
  text: string,
  team: string
};
export type PresenceMessage = {
  type: 'presence_change',
  presence: 'away' | 'active',
  user: string
};
export type ReconnectUrlMessage = { type: 'reconnect_url', url: string };

export type Message = HelloMessage
  | ErrorMessage
  | MessageMessage
  | PresenceMessage
  | ReconnectUrlMessage;

export interface Channel {
  id: string;
  name: string;
  is_channel: true;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  has_pins: boolean;
  is_member: boolean;
  previous_names: string[];
}

export interface ChannelList {
  readonly channels: Channel[];
}

export interface MessageParams {
  icon_emoji: string;
}

export interface SlackBotOptions {
  token: string;
  name: string;
}

export interface SlackBot {
  new (options: SlackBotOptions): SlackBot;

  on(eventName: 'start', handler: () => void): void;
  on(eventName: 'message', handler: (msg: Message) => void): void;
  on(eventName: 'open', handler: () => void): void;
  on(eventName: 'close', handler: () => void): void;
  on(eventName: 'error', handler: () => void): void;

  getChannels(): Promise<ChannelList>;
  getGroups(): Promise<any>;
  getUsers(): Promise<any>;
  getChannel(name: string): Promise<Channel>;

  postMessageToUser(user: string, message: string, params: MessageParams): Promise<any>;
  postMessageToGroup(group: string, message: string, params: MessageParams): Promise<any>;
  postMessageToChannel(channel: string, message: string, params: MessageParams): Promise<any>;
}


export const SlackBot = require('slackbots') as SlackBot;
