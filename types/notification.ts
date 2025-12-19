import { AccountType } from "./account";
import { PostType } from "./post";

export type NotificationType = {
  aid: string;
  action: 'reaction' | 'diffuse' | 'reply' | 'quote' | 'follow' | 'mention' | 'signin' | 'system';
  content?: string;
  checked: boolean;
  created_at: string;
  actor?: AccountType;
  post?: PostType;
};
