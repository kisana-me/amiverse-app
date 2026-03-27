import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { AccountOneLine } from "@/features/account";
import { ListedPost } from "@/features/post";
import { api } from "@/lib/axios";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";
import { AccountType } from "@/types/account";
import { FeedItemType } from "@/types/feed";
import { PostType } from "@/types/post";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

type SearchTab = "posts" | "accounts";

function sortPostsByFeed(posts: PostType[], feed?: FeedItemType[]): PostType[] {
  if (!Array.isArray(feed) || feed.length === 0) return posts;
  return feed
    .map((item) => posts.find((post) => post.aid === item.post_aid))
    .filter((post): post is PostType => !!post);
}

function normalizeSearchPosts(data: unknown): {
  posts: PostType[];
  feed: FeedItemType[];
} {
  const empty = { posts: [] as PostType[], feed: [] as FeedItemType[] };
  if (!data || typeof data !== "object") return empty;

  const payload =
    "data" in (data as object) && (data as { data?: unknown }).data
      ? (data as { data?: unknown }).data
      : data;

  if (!payload || typeof payload !== "object") return empty;

  const postsRaw = (payload as { posts?: unknown }).posts;
  const feedRaw = (payload as { feed?: unknown }).feed;

  return {
    posts: Array.isArray(postsRaw) ? (postsRaw as PostType[]) : [],
    feed: Array.isArray(feedRaw) ? (feedRaw as FeedItemType[]) : [],
  };
}

function normalizeSearchAccounts(data: unknown): AccountType[] {
  if (!data || typeof data !== "object") return [];

  const payload =
    "data" in (data as object) && (data as { data?: unknown }).data
      ? (data as { data?: unknown }).data
      : data;

  if (!payload || typeof payload !== "object") return [];

  if ("accounts" in (payload as object)) {
    const raw = (payload as { accounts?: unknown }).accounts;
    return Array.isArray(raw) ? (raw as AccountType[]) : [];
  }

  return [];
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ query?: string; tab?: SearchTab }>();
  const borderColor = useColors().border_color;
  const textColor = useColors().font_color;
  const tintColor = useColors().link_color;
  const { addToast } = useToast();

  const query = useMemo(() => (params.query ?? "").toString(), [params.query]);
  const initialTab = useMemo<SearchTab>(
    () => (params.tab === "accounts" ? "accounts" : "posts"),
    [params.tab],
  );

  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [searchInput, setSearchInput] = useState(query);

  const [posts, setPosts] = useState<PostType[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchPosts = useCallback(
    async (options?: { cursor?: number; append?: boolean }) => {
      if (!query) {
        setPosts([]);
        setHasMore(false);
        return;
      }

      const append = !!options?.append;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setHasMore(true);
      }

      try {
        const payload: { query: string; cursor?: number } = { query };
        if (options?.cursor) payload.cursor = options.cursor;

        const res = await api.post("/search", payload);
        const normalized = normalizeSearchPosts(res.data);
        const sorted = sortPostsByFeed(normalized.posts, normalized.feed);

        if (append) {
          if (sorted.length === 0) {
            setHasMore(false);
          } else {
            setPosts((prev) => [...prev, ...sorted]);
          }
        } else {
          setPosts(sorted);
          setHasMore(sorted.length > 0);
        }
      } catch (error) {
        addToast({
          message: "検索エラー",
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [addToast, query],
  );

  const fetchAccounts = useCallback(async () => {
    if (!query) {
      setAccounts([]);
      return;
    }

    setIsLoading(true);
    try {
      const attempts: Array<() => Promise<unknown>> = [];

      let resolved: AccountType[] = [];
      for (const attempt of attempts) {
        try {
          const res = await attempt();
          const next = normalizeSearchAccounts(res);
          if (next.length > 0) {
            resolved = next;
            break;
          }
        } catch {
          // try next endpoint shape
        }
      }

      setAccounts(resolved);
    } catch (error) {
      addToast({
        message: "アカウント検索エラー",
        detail: error instanceof Error ? error.message : String(error),
      });
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [addToast, query]);

  useEffect(() => {
    if (activeTab === "posts") {
      fetchPosts();
      return;
    }
    fetchAccounts();
  }, [activeTab, fetchAccounts, fetchPosts]);

  const handleSearchClick = useCallback(() => {
    const q = searchInput.trim();
    if (!q) return;
    router.push({ pathname: "/search", params: { query: q, tab: activeTab } });
  }, [activeTab, searchInput]);

  const handleLoadMorePosts = useCallback(() => {
    if (isLoadingMore || !hasMore || posts.length === 0) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost?.created_at) return;

    const cursor = Math.floor(new Date(lastPost.created_at).getTime() / 1000);
    void fetchPosts({ cursor, append: true });
  }, [fetchPosts, hasMore, isLoadingMore, posts]);

  const renderTab = (tab: SearchTab, label: string) => {
    const active = activeTab === tab;
    return (
      <Pressable
        key={tab}
        onPress={() => setActiveTab(tab)}
        style={[
          styles.tab,
          { borderBottomColor: active ? tintColor : "transparent" },
        ]}
      >
        <ThemedText style={[styles.tabText, { opacity: active ? 1 : 0.7 }]}>
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <MainHeader>
        <View style={styles.searchRow}>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="検索ワードを入力"
            placeholderTextColor={borderColor}
            style={[styles.searchInput, { borderColor, color: textColor }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearchClick}
          />
          <Pressable
            onPress={handleSearchClick}
            style={[styles.searchButton, { borderColor }]}
            accessibilityRole="button"
            accessibilityLabel="検索"
          >
            <ThemedText style={[styles.searchIcon, { color: borderColor }]}>
              🔎
            </ThemedText>
          </Pressable>
        </View>
      </MainHeader>

      <View style={[styles.tabs, { borderBottomColor: borderColor }]}>
        {renderTab("posts", "投稿")}
        {renderTab("accounts", "アカウント")}
      </View>

      {!query ? (
        <View style={styles.centerPad}>
          <ThemedText style={styles.subtle}>
            検索ワードを入力してください
          </ThemedText>
        </View>
      ) : activeTab === "posts" ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.aid}
          renderItem={({ item }) => <ListedPost {...item} />}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.centerPad}>
                <ActivityIndicator />
              </View>
            ) : (
              <View style={styles.centerPad}>
                <ThemedText style={styles.subtle}>
                  検索結果はありません
                </ThemedText>
              </View>
            )
          }
          ListFooterComponent={
            hasMore && posts.length > 0 && !isLoading ? (
              <View style={styles.footer}>
                <Pressable
                  onPress={handleLoadMorePosts}
                  disabled={isLoadingMore}
                  style={[
                    styles.loadMore,
                    { borderColor, opacity: isLoadingMore ? 0.5 : 1 },
                  ]}
                >
                  <ThemedText>
                    {isLoadingMore ? "読み込み中..." : "さらに読み込む"}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.aid}
          renderItem={({ item }) => <AccountOneLine account={item} />}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.centerPad}>
                <ActivityIndicator />
              </View>
            ) : (
              <View style={styles.centerPad}>
                <ThemedText style={styles.subtle}>
                  アカウントは見つかりませんでした
                </ThemedText>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingHorizontal: 8,
  },
  searchInput: {
    flexGrow: 1,
    flexShrink: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 20,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchIcon: {
    fontSize: 16,
    lineHeight: 16,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  centerPad: {
    padding: 24,
    alignItems: "center",
  },
  subtle: {
    opacity: 0.7,
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  loadMore: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
});
