import { PostType } from "@/types/post";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

export type CachedPost = PostType & {
  fetched_at: number;
};

type PostsContextType = {
  posts: Record<string, CachedPost>;
  addPosts: (newPosts: PostType[]) => void;
  removePost: (aid: string) => void;
  getPost: (aid: string) => CachedPost | undefined;
};

const PostsContext = createContext<PostsContextType | null>(null);

export const PostsProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<Record<string, CachedPost>>({});

  const addPosts = useCallback((newPosts: PostType[]) => {
    const now = Date.now();
    setPosts((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      newPosts.forEach((post) => {
        const existing = next[post.aid];
        // Update if not exists or if the new fetch is newer
        if (!existing || now >= existing.fetched_at) {
          next[post.aid] = { ...(existing || {}), ...post, fetched_at: now };
          hasChanges = true;
        }
      });

      return hasChanges ? next : prev;
    });
  }, []);

  const removePost = useCallback((aid: string) => {
    setPosts((prev) => {
      const next = { ...prev };
      if (next[aid]) {
        delete next[aid];
        return next;
      }
      return prev;
    });
  }, []);

  const getPost = useCallback(
    (aid: string) => {
      return posts[aid];
    },
    [posts],
  );

  const value: PostsContextType = {
    posts,
    addPosts,
    removePost,
    getPost,
  };

  return (
    <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
  );
};

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (!context) throw new Error("usePosts must be used within a PostsProvider");
  return context;
};
