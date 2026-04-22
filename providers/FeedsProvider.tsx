import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { FeedItemType, FeedType } from "@/types/feed";

type CachedFeed = {
  objects: FeedItemType[];
  fetched_at: number;
};

export type FeedTypeKey = "index" | "follow" | "current";

type FeedsContextType = {
  feeds: Record<string, CachedFeed>;
  addFeed: (feed: FeedType) => void;
  appendFeed: (feed: FeedType) => void;
  prependFeedItem: (type: string, item: FeedItemType) => void;
  getFeed: (type: string) => FeedItemType[] | undefined;
  currentFeedType: FeedTypeKey;
  setCurrentFeedType: (type: FeedTypeKey) => void;
  clearFeeds: () => void;
};

const FeedsContext = createContext<FeedsContextType | null>(null);

export const FeedsProvider = ({ children }: { children: ReactNode }) => {
  const [feeds, setFeeds] = useState<Record<string, CachedFeed>>({});
  const [currentFeedType, setCurrentFeedType] = useState<FeedTypeKey>("index");

  const addFeed = useCallback((feed: FeedType) => {
    const now = Date.now();
    setFeeds((prev) => {
      const existing = prev[feed.type];
      if (!existing || now >= existing.fetched_at) {
        return {
          ...prev,
          [feed.type.toString()]: {
            objects: feed.objects,
            fetched_at: now,
          },
        };
      }
      return prev;
    });
  }, []);

  const appendFeed = useCallback((feed: FeedType) => {
    setFeeds((prev) => {
      const existing = prev[feed.type];
      if (existing) {
        return {
          ...prev,
          [feed.type.toString()]: {
            objects: [...existing.objects, ...feed.objects],
            fetched_at: existing.fetched_at,
          },
        };
      }
      return {
        ...prev,
        [feed.type.toString()]: {
          objects: feed.objects,
          fetched_at: Date.now(),
        },
      };
    });
  }, []);

  const prependFeedItem = useCallback((type: string, item: FeedItemType) => {
    setFeeds((prev) => {
      const existing = prev[type];
      if (existing) {
        return {
          ...prev,
          [type]: {
            objects: [item, ...existing.objects],
            fetched_at: existing.fetched_at,
          },
        };
      }
      return prev;
    });
  }, []);

  const getFeed = useCallback(
    (type: string) => {
      return feeds[type]?.objects;
    },
    [feeds],
  );

  const clearFeeds = useCallback(() => {
    setFeeds({});
    setCurrentFeedType("index");
  }, []);

  const value: FeedsContextType = useMemo(
    () => ({
      feeds,
      addFeed,
      appendFeed,
      prependFeedItem,
      getFeed,
      currentFeedType,
      setCurrentFeedType,
      clearFeeds,
    }),
    [
      feeds,
      addFeed,
      appendFeed,
      prependFeedItem,
      getFeed,
      currentFeedType,
      clearFeeds,
    ],
  );

  return (
    <FeedsContext.Provider value={value}>{children}</FeedsContext.Provider>
  );
};

export const useFeeds = () => {
  const context = useContext(FeedsContext);
  if (!context) throw new Error("useFeeds must be used within a FeedsProvider");
  return context;
};
