import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useScrollToTop } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import Post from "@/components/post/post";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColors } from "@/providers/UIProvider";
import { api } from "@/lib/axios";
import { addHomeRefreshListener } from "@/lib/home-refresh";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useFeeds } from "@/providers/FeedsProvider";
import { CachedPost, usePosts } from "@/providers/PostsProvider";
import { useToast } from "@/providers/ToastProvider";
import { FeedItemType } from "@/types/feed";
import { PostType } from "@/types/post";

type FeedTab = "index" | "follow" | "current";

export default function HomeScreen() {
  const colors = useColors();
  const listRef = useRef<FlatList<PostType> | null>(null);
  const tabBarHeight = useBottomTabBarHeight();
  useScrollToTop(listRef);

  const { addToast } = useToast();
  const { addPosts, getPost } = usePosts();
  const {
    addFeed,
    appendFeed,
    feeds,
    getFeed,
    currentFeedType,
    setCurrentFeedType,
  } = useFeeds();
  const { currentAccountStatus } = useCurrentAccount();

  const borderColor = colors.border_color;
  const tintColor = colors.link_color;
  const tabBackgroundColor = colors.inactive_background_color;

  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const cachedFeed = feeds[currentFeedType];
  const fetchedAt = cachedFeed?.fetched_at;

  const posts = useMemo<PostType[]>(() => {
    const feedObjects = getFeed(currentFeedType) ?? [];
    const cachedPosts = feedObjects
      .map((item) =>
        item.type === "post" ? getPost(item.post_aid) : undefined,
      )
      .filter((p): p is CachedPost => !!p);

    return cachedPosts.map(({ fetched_at: _fetchedAt, ...post }) => post);
  }, [currentFeedType, getFeed, getPost]);

  const fetchPost = useCallback(async () => {
    if (currentAccountStatus === "loading") return;

    if (!feeds[currentFeedType]) {
      setIsFeedLoading(true);
    } else {
      setIsRefetching(true);
    }

    try {
      const res = await api.post(`/feeds/${currentFeedType}`);
      if (!res.data) return;

      const data = res.data as { posts: PostType[]; feed?: FeedItemType[] };

      // Store posts content
      if (data.posts) {
        addPosts(data.posts);
      }

      if (data.feed) {
        addFeed({ type: currentFeedType, objects: data.feed });
      } else if (data.posts) {
        // feedがない場合はpostsの順序でfeedを作成
        const generatedFeed: FeedItemType[] = data.posts.map((post) => ({
          type: "post",
          post_aid: post.aid,
        }));
        addFeed({ type: currentFeedType, objects: generatedFeed });
      }
    } catch (error) {
      addToast({
        message: "タイムライン取得エラー",
        detail: error instanceof Error ? error.message : String(error),
      });
      console.error("Failed to fetch feed:", error);
    } finally {
      setIsFeedLoading(false);
      setIsRefetching(false);
    }
  }, [
    addPosts,
    addFeed,
    addToast,
    currentFeedType,
    currentAccountStatus,
    feeds,
  ]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || posts.length === 0) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost?.created_at) return;

    setIsLoadingMore(true);
    try {
      const cursor = Math.floor(new Date(lastPost.created_at).getTime() / 1000);
      const res = await api.post(`/feeds/${currentFeedType}`, { cursor });
      if (!res.data) return;

      const data = res.data as { posts: PostType[]; feed?: FeedItemType[] };
      const newPosts = data.posts || [];
      const newFeedItems = data.feed || [];

      if (newPosts.length === 0 && newFeedItems.length === 0) {
        setHasMore(false);
        return;
      }

      if (newPosts.length > 0) addPosts(newPosts);

      if (newFeedItems.length > 0) {
        appendFeed({ type: currentFeedType, objects: newFeedItems });
      } else if (newPosts.length > 0) {
        const generatedFeed: FeedItemType[] = newPosts.map((post) => ({
          type: "post",
          post_aid: post.aid,
        }));
        appendFeed({ type: currentFeedType, objects: generatedFeed });
      } else {
        setHasMore(false);
      }
    } catch (error) {
      addToast({
        message: "読み込みエラー",
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    addPosts,
    addToast,
    appendFeed,
    currentFeedType,
    hasMore,
    isLoadingMore,
    posts,
  ]);

  useEffect(() => {
    if (currentAccountStatus === "loading") return;
    if (!feeds[currentFeedType]) {
      fetchPost();
    }
  }, [currentAccountStatus, currentFeedType, fetchPost, feeds]);

  useEffect(() => {
    setHasMore(true);
  }, [currentFeedType]);

  useEffect(() => {
    const sub = addHomeRefreshListener((payload) => {
      if (payload.scrollToTop) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      if (payload.reload) {
        fetchPost();
      }
    });
    return () => sub.remove();
  }, [fetchPost]);

  const handleTabChange = useCallback(
    (type: FeedTab) => {
      if (type === "follow" && currentAccountStatus !== "signed_in") {
        setIsSignInModalOpen(true);
        return;
      }
      setCurrentFeedType(type);
    },
    [currentAccountStatus, setCurrentFeedType],
  );

  const openSignin = useCallback(async () => {
    const authUrl = process.env.EXPO_PUBLIC_AUTH_URL;
    if (!authUrl) {
      addToast({
        message: "サインインURL未設定",
        detail: "EXPO_PUBLIC_AUTH_URL を設定してください",
      });
      return;
    }
    const redirectUri = Linking.createURL("auth");
    const url = `${authUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    await WebBrowser.openBrowserAsync(url);
  }, [addToast]);

  const renderTabButton = (type: FeedTab, label: string) => {
    const isActive = currentFeedType === type;
    return (
      <Pressable
        key={type}
        onPress={() => handleTabChange(type)}
        style={[
          styles.tab,
          {
            borderBottomColor: isActive ? tintColor : "transparent",
            opacity: isActive ? 1 : 0.7,
          },
        ]}
      >
        <ThemedText style={styles.tabText}>{label}</ThemedText>
      </Pressable>
    );
  };

  return (
    <>
      <MainHeader>
        <View style={styles.tabs}>
          {renderTabButton("index", "人気")}
          {renderTabButton("follow", "フォロー中")}
          {renderTabButton("current", "最新")}
        </View>
      </MainHeader>

      <ThemedView style={styles.container}>
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(item) => item.aid}
          renderItem={({ item }) => <Post {...item} />}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 12 }}
          refreshing={isRefetching}
          onRefresh={fetchPost}
          ListHeaderComponent={
            <ThemedView
              style={[styles.metaRow, { borderBottomColor: borderColor }]}
            >
              <ThemedText style={styles.metaText}>
                {fetchedAt
                  ? `最終更新: ${new Date(fetchedAt).toLocaleString()}`
                  : "未取得"}
              </ThemedText>
              <Pressable
                onPress={fetchPost}
                disabled={isRefetching || isFeedLoading}
                style={[
                  styles.reloadButton,
                  {
                    borderColor,
                    opacity: isRefetching || isFeedLoading ? 0.5 : 1,
                  },
                ]}
              >
                <ThemedText style={styles.reloadText}>
                  {isRefetching ? "更新中..." : "再読み込み"}
                </ThemedText>
              </Pressable>
            </ThemedView>
          }
          ListEmptyComponent={
            isFeedLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator />
              </View>
            ) : null
          }
          ListFooterComponent={
            currentFeedType !== "index" && hasMore && posts.length > 0 ? (
              <View style={styles.footer}>
                <Pressable
                  onPress={loadMore}
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

        <Pressable
          style={[
            styles.fab,
            {
              bottom: tabBarHeight + 20,
              backgroundColor: tabBackgroundColor,
              borderColor,
            },
          ]}
          onPress={() => router.push("/create")}
          accessibilityRole="button"
          accessibilityLabel="新規投稿"
        >
          <ThemedText style={[styles.fabText, { color: colors.font_color }]}>
            +
          </ThemedText>
        </Pressable>
      </ThemedView>

      <Modal
        visible={isSignInModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSignInModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <ThemedView style={styles.modalCard}>
            <ThemedText type="subtitle">サインインが必要です</ThemedText>
            <ThemedText style={styles.modalBody}>
              フォロー中の投稿を見るにはサインインが必要です。
            </ThemedText>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsSignInModalOpen(false)}
                style={styles.modalButton}
              >
                <ThemedText>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                onPress={async () => {
                  setIsSignInModalOpen(false);
                  await openSignin();
                }}
                style={[styles.modalButton, styles.modalPrimary]}
              >
                <ThemedText>サインイン</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  metaRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 12,
    opacity: 0.7,
  },
  reloadButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  reloadText: {
    fontSize: 12,
  },
  loading: {
    padding: 24,
    alignItems: "center",
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
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 16,
    borderRadius: 12,
  },
  modalBody: {
    marginTop: 8,
    opacity: 0.8,
  },
  modalActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalPrimary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "700",
  },
});
