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
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  buildDisplayFeedPosts,
  DisplayFeedPost,
  ListedFeedPost,
} from "@/features/feed";
import { api } from "@/lib/axios";
import { addHomeRefreshListener } from "@/lib/home-refresh";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useFeeds } from "@/providers/FeedsProvider";
import { useModal } from "@/providers/ModalProvider";
import { CachedPost, usePosts } from "@/providers/PostsProvider";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";
import { FeedItemType } from "@/types/feed";
import { PostType } from "@/types/post";

type FeedTab = "index" | "follow" | "current";

const MAIN_HEADER_HEIGHT = 50;
const FEED_META_ROW_HEIGHT = 40;
const REFRESH_INDICATOR_OFFSET = MAIN_HEADER_HEIGHT + FEED_META_ROW_HEIGHT;

export default function HomeScreen() {
  const colors = useColors();
  const listRef = useRef<FlatList<DisplayFeedPost> | null>(null);
  const scrollOffsetsRef = useRef<Record<FeedTab, number>>({
    index: 0,
    follow: 0,
    current: 0,
  });
  const pendingRestoreTabRef = useRef<FeedTab | null>(null);
  useScrollToTop(listRef);

  const { addToast } = useToast();
  const { addPosts, getPost } = usePosts();
  const { openSignInModal } = useModal();
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const cachedFeed = feeds[currentFeedType];
  const fetchedAt = cachedFeed?.fetched_at;

  const posts = useMemo<PostType[]>(() => {
    const feedObjects = getFeed(currentFeedType) ?? [];
    const cachedPosts = feedObjects
      .map((post) =>
        post.type === "post" ? getPost(post.post_aid) : undefined,
      )
      .filter((p): p is CachedPost => !!p);

    return cachedPosts.map(({ fetched_at: _fetchedAt, ...post }) => post);
  }, [currentFeedType, getFeed, getPost]);

  const displayFeedPosts = useMemo<DisplayFeedPost[]>(() => {
    return buildDisplayFeedPosts(posts, cachedFeed?.objects);
  }, [cachedFeed?.objects, posts]);

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
    if (isLoadingMore || !hasMore || displayFeedPosts.length === 0) return;
    const lastPost = displayFeedPosts[displayFeedPosts.length - 1]?.post;
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
    displayFeedPosts,
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
        scrollOffsetsRef.current[currentFeedType] = 0;
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
      if (payload.reload) {
        fetchPost();
      }
    });
    return () => sub.remove();
  }, [currentFeedType, fetchPost]);

  useEffect(() => {
    if (pendingRestoreTabRef.current !== currentFeedType) return;

    const offset = scrollOffsetsRef.current[currentFeedType] ?? 0;
    if (displayFeedPosts.length === 0 && offset > 0) return;

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset, animated: false });
      pendingRestoreTabRef.current = null;
    });

    return () => cancelAnimationFrame(frame);
  }, [currentFeedType, displayFeedPosts.length]);

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetsRef.current[currentFeedType] =
        event.nativeEvent.contentOffset.y;
    },
    [currentFeedType],
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

  const handleTabChange = useCallback(
    (type: FeedTab) => {
      if (type === currentFeedType) return;

      if (type === "follow" && currentAccountStatus !== "signed_in") {
        openSignInModal({
          title: "サインインが必要です",
          message: "フォロー中の投稿を見るにはサインインが必要です。",
          closeLabel: "キャンセル",
          signInLabel: "サインイン",
          onSignIn: openSignin,
        });
        return;
      }

      pendingRestoreTabRef.current = type;
      setCurrentFeedType(type);
    },
    [
      currentAccountStatus,
      currentFeedType,
      openSignInModal,
      openSignin,
      setCurrentFeedType,
    ],
  );

  const handleCreatePress = useCallback(() => {
    if (currentAccountStatus !== "signed_in") {
      openSignInModal({
        title: "サインインが必要です",
        message: "新規投稿を作成するにはサインインが必要です。",
        closeLabel: "キャンセル",
        signInLabel: "サインイン",
        onSignIn: openSignin,
      });
      return;
    }

    router.push("/create");
  }, [currentAccountStatus, openSignInModal, openSignin]);

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
          data={displayFeedPosts}
          progressViewOffset={REFRESH_INDICATOR_OFFSET}
          keyExtractor={(post, index) =>
            `${post.post.aid}-${post.feedItem?.type ?? "post"}-${post.feedItem?.created_at ?? index}`
          }
          renderItem={({ item: post }) => (
            <ListedFeedPost post={post.post} feedItem={post.feedItem} />
          )}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
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
            currentFeedType !== "index" &&
            hasMore &&
            displayFeedPosts.length > 0 ? (
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
              bottom: 20,
              backgroundColor: tabBackgroundColor,
              borderColor,
            },
          ]}
          onPress={handleCreatePress}
          accessibilityRole="button"
          accessibilityLabel="新規投稿"
        >
          <ThemedText style={[styles.fabText, { color: colors.font_color }]}>
            +
          </ThemedText>
        </Pressable>
      </ThemedView>
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
