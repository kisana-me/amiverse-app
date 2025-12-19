export type FeedType = {
  type: string;
  objects: FeedItemType[];
  fetched_at?: string;
};

export type FeedItemType = {
  type: "post" | "diffuse";
  post_aid: string;
  account?: {
    aid: string;
    name: string;
    name_id: string;
    icon_url?: string;
  }
  created_at?: string;
};
