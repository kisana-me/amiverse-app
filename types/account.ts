import { PostType } from "./post";

export type AccountType = {
  aid: string;
  name: string;
  name_id: string;
  icon_url: string;

  banner_url?: string;
  description?: string;
  birthdate?: string;
  visibility?: string;
  created_at?: string;

  followers_count?: number;
  following_count?: number;
  posts_count?: number;

  is_following?: boolean;
  is_followed?: boolean;

  ring_color?: string;
  status_rb_color?: string;

  badges?: {
    name: string;
    url: string;
  }[];

  // posts: PostType[];
}
