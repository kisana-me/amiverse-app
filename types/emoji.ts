export type EmojiType = {
  aid: string;
  name: string;
  name_id: string;
  image_url?: string;

  reactions_count?: number;
  reacted?: boolean;

  description?: string;
  group?: string;
  subgroup?: string;
}
