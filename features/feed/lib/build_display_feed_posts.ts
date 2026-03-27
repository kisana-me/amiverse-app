import { FeedItemType } from "@/types/feed";
import { PostType } from "@/types/post";

export type DisplayFeedPost = {
  post: PostType;
  feedItem?: FeedItemType;
};

export const buildDisplayFeedPosts = (
  posts: PostType[],
  feedObjects?: FeedItemType[],
): DisplayFeedPost[] => {
  if (feedObjects && Array.isArray(feedObjects)) {
    const postMap = new Map(posts.map((post) => [post.aid, post]));

    return feedObjects
      .map((post) => {
        const resolvedPost = postMap.get(post.post_aid);
        return resolvedPost
          ? { post: resolvedPost, feedItem: post }
          : undefined;
      })
      .filter(
        (post): post is { post: PostType; feedItem: FeedItemType } =>
          post !== undefined,
      );
  }

  return posts.map((post) => ({ post }));
};
