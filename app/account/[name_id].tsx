import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { REPORT_CATEGORIES } from "@/features/post/actions/menu";
import ItemContent from "@/features/post/components/content";
import { api } from "@/lib/axios";
import { formatFullDate } from "@/lib/format_time";
import { useAccounts } from "@/providers/AccountsProvider";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useFeeds } from "@/providers/FeedsProvider";
import { CachedPost, usePosts } from "@/providers/PostsProvider";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";
import { FeedItemType } from "@/types/feed";
import { PostType } from "@/types/post";

function normalizeFeedResponse(data: unknown): {
  posts?: PostType[];
  feed?: FeedItemType[];
} {
  const payload =
    data && typeof data === "object" && "data" in (data as object)
      ? (data as { data?: unknown }).data
      : undefined;
  return (payload ?? data ?? {}) as {
    posts?: PostType[];
    feed?: FeedItemType[];
  };
}

const FEED_CACHE_TTL_MS = 7000;
const ACCOUNT_CACHE_TTL_MS = 7000;
type ReportCategoryKey = (typeof REPORT_CATEGORIES)[number]["key"];

export default function AccountDetailScreen() {
  const params = useLocalSearchParams<{ name_id?: string }>();
  const nameId = (params.name_id ?? "").toString();

  const borderColor = useColors().border_color;
  const backgroundColor = useColors().background_color;
  const tintColor = useColors().link_color;
  const textColor = useColors().font_color;

  const { addToast } = useToast();
  const { currentAccount, currentAccountStatus } = useCurrentAccount();
  const { accounts, fetchAccount, updateAccount } = useAccounts();
  const { addPosts, getPost } = usePosts();
  const { addFeed, appendFeed, feeds, getFeed } = useFeeds();

  const account = nameId ? (accounts[nameId] ?? null) : null;
  const [isAccountLoading, setIsAccountLoading] = useState<boolean>(
    !!nameId && !accounts[nameId],
  );

  const isSignedIn =
    currentAccountStatus === "signed_in" && !!currentAccount?.aid;
  const isSelf =
    isSignedIn && !!account?.aid && currentAccount?.aid === account.aid;

  const feedKey = account?.aid ?? "";
  const posts = useMemo<PostType[]>(() => {
    if (!feedKey) return [];
    const feedObjects = getFeed(feedKey) ?? [];
    const cachedPosts = feedObjects
      .map((item) => getPost(item.post_aid))
      .filter((p): p is CachedPost => !!p);
    return cachedPosts.map(({ fetched_at: _fetchedAt, ...post }) => post);
  }, [feedKey, getFeed, getPost]);

  const displayFeedPosts = useMemo<DisplayFeedPost[]>(() => {
    if (!feedKey) return [];
    return buildDisplayFeedPosts(posts, feeds[feedKey]?.objects);
  }, [feedKey, feeds, posts]);

  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(
    !!account && !!feedKey && !feeds[feedKey],
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [pendingReportOpen, setPendingReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategoryKey>(
    REPORT_CATEGORIES[0].key,
  );
  const [reportDetail, setReportDetail] = useState("");
  const [isBlockingSubmitting, setIsBlockingSubmitting] = useState(false);
  const [isReportingSubmitting, setIsReportingSubmitting] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") return;
    if (!pendingReportOpen || isMenuModalOpen) return;
    setIsReportModalOpen(true);
    setPendingReportOpen(false);
  }, [pendingReportOpen, isMenuModalOpen]);

  const fetchAccountWithCacheControl = useCallback(async () => {
    if (!nameId) return;
    if (currentAccountStatus === "loading") return;

    const cachedAccount = accounts[nameId];
    const isCacheFresh =
      !!cachedAccount &&
      Date.now() - cachedAccount.fetched_at < ACCOUNT_CACHE_TTL_MS;
    if (isCacheFresh) {
      setIsAccountLoading(false);
      return;
    }

    setIsAccountLoading(true);
    try {
      await fetchAccount(nameId, true);
    } finally {
      setIsAccountLoading(false);
    }
  }, [nameId, currentAccountStatus, accounts, fetchAccount]);

  useEffect(() => {
    void fetchAccountWithCacheControl();
  }, [fetchAccountWithCacheControl]);

  const fetchFeed = useCallback(
    async (force = false) => {
      if (currentAccountStatus === "loading") return;
      if (!account?.aid) return;

      const cachedFeed = feeds[account.aid];
      const isCacheFresh =
        !!cachedFeed && Date.now() - cachedFeed.fetched_at < FEED_CACHE_TTL_MS;
      if (!force && isCacheFresh) return;

      setIsFeedLoading(true);
      try {
        const res = await api.post("/feeds/account", {
          aid: account.aid,
          cursor: null,
        });
        const data = normalizeFeedResponse(res.data);

        const newPosts = data.posts ?? [];
        const newFeedItems = data.feed;

        if (newPosts.length > 0) addPosts(newPosts);

        if (Array.isArray(newFeedItems) && newFeedItems.length > 0) {
          addFeed({ type: account.aid, objects: newFeedItems });
        } else if (newPosts.length > 0) {
          const generatedFeed: FeedItemType[] = newPosts.map((post) => ({
            type: "post",
            post_aid: post.aid,
          }));
          addFeed({ type: account.aid, objects: generatedFeed });
        } else {
          addFeed({ type: account.aid, objects: [] });
        }
      } catch (error) {
        addToast({
          message: "投稿取得エラー",
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsFeedLoading(false);
      }
    },
    [account?.aid, addFeed, addPosts, addToast, currentAccountStatus, feeds],
  );

  const refreshAccountAndFeed = useCallback(async () => {
    await Promise.all([fetchAccountWithCacheControl(), fetchFeed(true)]);
  }, [fetchAccountWithCacheControl, fetchFeed]);

  useEffect(() => {
    if (currentAccountStatus === "loading") return;
    if (!account?.aid) return;
    if (!feeds[account.aid]) {
      fetchFeed();
    }
  }, [account?.aid, currentAccountStatus, feeds, fetchFeed]);

  const loadMore = useCallback(async () => {
    if (!account?.aid) return;
    if (isLoadingMore || !hasMore || displayFeedPosts.length === 0) return;

    const lastPost = displayFeedPosts[displayFeedPosts.length - 1]?.post;
    if (!lastPost?.created_at) return;

    setIsLoadingMore(true);
    try {
      const cursor = Math.floor(new Date(lastPost.created_at).getTime() / 1000);
      const res = await api.post("/feeds/account", {
        aid: account.aid,
        cursor,
      });
      const data = normalizeFeedResponse(res.data);

      const newPosts = data.posts ?? [];
      const newFeedItems = data.feed ?? [];

      if (newPosts.length === 0 && newFeedItems.length === 0) {
        setHasMore(false);
        return;
      }

      if (newPosts.length > 0) addPosts(newPosts);

      if (newFeedItems.length > 0) {
        appendFeed({ type: account.aid, objects: newFeedItems });
      } else if (newPosts.length > 0) {
        const generatedFeed: FeedItemType[] = newPosts.map((post) => ({
          type: "post",
          post_aid: post.aid,
        }));
        appendFeed({ type: account.aid, objects: generatedFeed });
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
    account?.aid,
    addPosts,
    addToast,
    appendFeed,
    hasMore,
    isLoadingMore,
    displayFeedPosts,
  ]);

  const handleFollow = useCallback(async () => {
    if (!account?.aid) return;
    if (!nameId) return;

    if (!isSignedIn) {
      addToast({
        message: "フォローできません",
        detail: "サインインしてください",
      });
      router.push("/signin");
      return;
    }

    if (isSelf) {
      addToast({
        message: "フォローできません",
        detail: "自分はフォローできません",
      });
      return;
    }

    const isFollowing = !!account.is_following;
    const originalFollowersCount = account.followers_count ?? 0;

    updateAccount(nameId, {
      is_following: !isFollowing,
      followers_count: isFollowing
        ? Math.max(0, originalFollowersCount - 1)
        : originalFollowersCount + 1,
    });

    try {
      if (isFollowing) {
        await api.delete(`/accounts/${account.aid}/follow`);
      } else {
        await api.post(`/accounts/${account.aid}/follow`);
      }
    } catch {
      updateAccount(nameId, {
        is_following: isFollowing,
        followers_count: originalFollowersCount,
      });
      addToast({ message: "エラー", detail: "フォロー操作に失敗しました" });
    }
  }, [account, addToast, isSelf, isSignedIn, nameId, updateAccount]);

  const handleMenuPress = useCallback(() => {
    setIsMenuModalOpen(true);
  }, []);

  const handleBlock = useCallback(async () => {
    if (!account?.aid || !nameId) return;
    if (!isSignedIn) {
      addToast({
        message: "操作できません",
        detail: "サインインしてください",
      });
      router.push("/signin");
      return;
    }
    if (isSelf || isBlockingSubmitting) return;

    const isBlocking = !!account.is_blocking;
    updateAccount(nameId, { is_blocking: !isBlocking });

    setIsBlockingSubmitting(true);
    try {
      if (isBlocking) {
        await api.delete(`/accounts/${account.aid}/block`);
      } else {
        await api.post(`/accounts/${account.aid}/block`);
      }
      addToast({
        message: isBlocking ? "ブロックを解除しました" : "ブロックしました",
      });
      setIsMenuModalOpen(false);
    } catch (error) {
      updateAccount(nameId, { is_blocking: isBlocking });
      addToast({
        message: "エラー",
        detail:
          error instanceof Error
            ? error.message
            : isBlocking
              ? "ブロック解除に失敗しました"
              : "ブロックに失敗しました",
      });
    } finally {
      setIsBlockingSubmitting(false);
    }
  }, [
    account,
    nameId,
    isSignedIn,
    addToast,
    isSelf,
    isBlockingSubmitting,
    updateAccount,
  ]);

  const handleReportPress = useCallback(() => {
    if (!account?.aid) return;
    if (!isSignedIn) {
      addToast({
        message: "操作できません",
        detail: "サインインしてください",
      });
      router.push("/signin");
      return;
    }
    if (isSelf) return;
    setPendingReportOpen(true);
    setIsMenuModalOpen(false);
  }, [account?.aid, addToast, isSignedIn, isSelf]);

  const submitAccountReport = useCallback(async () => {
    if (!account?.aid) return;
    if (!isSignedIn || isSelf || isReportingSubmitting) return;

    setIsReportingSubmitting(true);
    try {
      await api.post("/reports", {
        report: {
          target_type: "account",
          target_aid: account.aid,
          category: reportCategory,
          description: reportDetail,
        },
      });

      addToast({ message: "通報しました" });
      setReportCategory(REPORT_CATEGORIES[0].key);
      setReportDetail("");
      setIsReportModalOpen(false);
      setIsMenuModalOpen(false);
    } catch (error) {
      addToast({
        message: "通報に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsReportingSubmitting(false);
    }
  }, [
    account?.aid,
    isSignedIn,
    isSelf,
    isReportingSubmitting,
    reportCategory,
    reportDetail,
    addToast,
  ]);

  const headerTitle = account?.name || "アカウント";

  const bannerSource = useMemo(() => {
    const uri = account?.banner_url;
    if (!uri) return null;
    return { uri };
  }, [account?.banner_url]);

  const iconSource = useMemo(() => {
    const uri = account?.icon_url;
    if (!uri) return null;
    return { uri };
  }, [account?.icon_url]);

  const headerElement = useMemo(() => {
    if (!nameId) {
      return (
        <ThemedView style={styles.container}>
          <ThemedText>アカウントが指定されていません</ThemedText>
        </ThemedView>
      );
    }

    if (!account && (isAccountLoading || currentAccountStatus === "loading")) {
      return (
        <ThemedView style={styles.container}>
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <ThemedText>読み込み中...</ThemedText>
          </View>
        </ThemedView>
      );
    }

    if (!account) {
      return (
        <ThemedView style={styles.container}>
          <ThemedText>アカウントが見つかりません</ThemedText>
          <ThemedText style={styles.subtle}>@{nameId}</ThemedText>
        </ThemedView>
      );
    }

    return (
      <View>
        <View style={styles.bannerWrap}>
          {bannerSource ? (
            <Image
              source={bannerSource}
              style={styles.banner}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <View style={[styles.banner, { backgroundColor }]} />
          )}
        </View>

        <View style={styles.plate}>
          <View
            style={[
              styles.avatarRing,
              {
                borderWidth:
                  account.ring_color && account.ring_color.trim().length > 0
                    ? 2
                    : 0,
                borderColor:
                  account.ring_color && account.ring_color.trim().length > 0
                    ? account.ring_color
                    : "transparent",
                backgroundColor,
              },
            ]}
          >
            {account.status_rb_color &&
            account.status_rb_color.trim().length > 0 ? (
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: account.status_rb_color,
                    borderColor: backgroundColor,
                  },
                ]}
              />
            ) : null}
            {iconSource ? (
              <Image
                source={iconSource}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor }]} />
            )}
          </View>

          <View style={styles.nameBlock}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {account.name}
            </ThemedText>
            <ThemedText style={styles.subtle} numberOfLines={1}>
              @{account.name_id}
            </ThemedText>
          </View>

          <View style={styles.actionButtons}>
            {isSelf ? (
              <Pressable
                onPress={() => router.push("/settings/account" as any)}
                style={({ pressed }) => [
                  styles.followButton,
                  {
                    borderColor,
                    backgroundColor,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <ThemedText>プロフィール編集</ThemedText>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={handleFollow}
                  style={({ pressed }) => [
                    styles.followButton,
                    {
                      borderColor: account.is_following
                        ? tintColor
                        : borderColor,
                      backgroundColor: account.is_following
                        ? backgroundColor
                        : tintColor,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      color: account.is_following ? tintColor : backgroundColor,
                    }}
                  >
                    {account.is_following ? "Following" : "Follow"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleMenuPress}
                  style={({ pressed }) => [
                    styles.menuButton,
                    {
                      borderColor,
                      backgroundColor,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <ThemedText>Menu</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {account.badges && account.badges.length > 0 && (
          <View style={styles.badges}>
            {account.badges.map((badge) => (
              <View key={badge.url} style={[styles.badge, { borderColor }]}>
                <Image
                  source={{ uri: badge.url }}
                  style={styles.badgeIcon}
                  contentFit="contain"
                  cachePolicy="disk"
                />
                <ThemedText numberOfLines={1} style={styles.badgeText}>
                  {badge.name}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <ThemedView style={[styles.profile, { borderColor }]}>
          <ItemContent content={account.description || ""} />

          <View style={styles.keyValues}>
            {account.birthdate ? (
              <View style={styles.keyValue}>
                <ThemedText style={styles.key}>🎂誕生日</ThemedText>
                <ThemedText style={styles.value}>
                  {formatFullDate(new Date(account.birthdate))}
                </ThemedText>
              </View>
            ) : null}
            {account.created_at ? (
              <View style={styles.keyValue}>
                <ThemedText style={styles.key}>🎫参加日</ThemedText>
                <ThemedText style={styles.value}>
                  {formatFullDate(new Date(account.created_at))}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={[styles.counters, { borderColor }]}>
            <View style={styles.counter}>
              <ThemedText type="defaultSemiBold">
                {account.followers_count ?? 0}
              </ThemedText>
              <ThemedText style={styles.subtle}>フォロワー</ThemedText>
            </View>
            <View style={styles.counter}>
              <ThemedText type="defaultSemiBold">
                {account.following_count ?? 0}
              </ThemedText>
              <ThemedText style={styles.subtle}>フォロー</ThemedText>
            </View>
            <View style={styles.counter}>
              <ThemedText type="defaultSemiBold">
                {account.posts_count ?? 0}
              </ThemedText>
              <ThemedText style={styles.subtle}>投稿数</ThemedText>
            </View>
          </View>
        </ThemedView>

        <ThemedView style={[styles.accountTabs, { borderColor }]}>
          <ThemedText type="defaultSemiBold" style={styles.accountTabActive}>
            投稿
          </ThemedText>
          <ThemedText style={styles.accountTabDisabled}>返信</ThemedText>
          <ThemedText style={styles.accountTabDisabled}>メディア</ThemedText>
          <ThemedText style={styles.accountTabDisabled}>
            リアクション
          </ThemedText>
        </ThemedView>
      </View>
    );
  }, [
    account,
    backgroundColor,
    bannerSource,
    borderColor,
    currentAccountStatus,
    handleFollow,
    handleMenuPress,
    iconSource,
    isAccountLoading,
    isSelf,
    nameId,
    tintColor,
  ]);

  return (
    <View style={{ flex: 1 }}>
      <MainHeader>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {headerTitle}
        </ThemedText>
      </MainHeader>

      <FlatList
        data={displayFeedPosts}
        keyExtractor={(item, index) =>
          `${item.post.aid}-${item.feedItem?.type ?? "post"}-${item.feedItem?.created_at ?? index}`
        }
        renderItem={({ item }) => (
          <ListedFeedPost post={item.post} feedItem={item.feedItem} />
        )}
        ListHeaderComponent={headerElement}
        onRefresh={refreshAccountAndFeed}
        refreshing={isFeedLoading || isAccountLoading}
        ListEmptyComponent={
          account && (isFeedLoading || isAccountLoading) ? (
            <View style={styles.centerPad}>
              <ActivityIndicator />
            </View>
          ) : account ? (
            <View style={styles.centerPad}>
              <ThemedText style={styles.subtle}>投稿はありません</ThemedText>
            </View>
          ) : null
        }
        ListFooterComponent={
          !account ? null : isLoadingMore ? (
            <View style={styles.centerPad}>
              <ActivityIndicator />
            </View>
          ) : hasMore && displayFeedPosts.length > 0 ? (
            <View style={styles.footer}>
              <Pressable
                onPress={loadMore}
                disabled={isLoadingMore}
                style={[styles.loadMore, { borderColor }]}
              >
                <ThemedText>
                  {isLoadingMore ? "読み込み中..." : "さらに読み込む"}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centerPad}>
              <ThemedText style={styles.subtle}>
                これ以上投稿はありません
              </ThemedText>
            </View>
          )
        }
      />

      <Modal
        visible={isMenuModalOpen}
        transparent
        animationType="fade"
        onDismiss={() => {
          if (!pendingReportOpen) return;
          setIsReportModalOpen(true);
          setPendingReportOpen(false);
        }}
        onRequestClose={() => setIsMenuModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsMenuModalOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor, borderColor }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>
              アカウントメニュー
            </ThemedText>
            {account?.aid ? (
              <ThemedText style={styles.menuMeta}>
                アカウントID: {account.aid}
              </ThemedText>
            ) : null}

            {account && !isSelf && isSignedIn ? (
              <>
                <Pressable
                  onPress={handleBlock}
                  disabled={isBlockingSubmitting}
                  style={[styles.menuDangerButton, { borderColor: "#d93838" }]}
                >
                  <ThemedText style={styles.dangerText}>
                    {account.is_blocking
                      ? "アカウントのブロックを解除"
                      : "アカウントをブロック"}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleReportPress}
                  style={[styles.menuDangerButton, { borderColor: "#d93838" }]}
                >
                  <ThemedText style={styles.dangerText}>
                    アカウントを通報
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <ThemedText style={styles.menuMeta}>
                {isSelf
                  ? "自分のアカウントです"
                  : "操作するにはサインインしてください"}
              </ThemedText>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isReportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReportModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsReportModalOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor, borderColor }]}
            onPress={() => undefined}
          >
            <ThemedText style={styles.modalTitle}>アカウントを通報</ThemedText>

            <ScrollView style={styles.reportBody}>
              <ThemedText style={styles.modalLabel}>通報の理由</ThemedText>
              <View style={[styles.pickerWrap, { borderColor }]}>
                <Picker
                  selectedValue={reportCategory}
                  onValueChange={(value) =>
                    setReportCategory(value as ReportCategoryKey)
                  }
                  style={[styles.picker, { color: textColor }]}
                >
                  {REPORT_CATEGORIES.map((category) => (
                    <Picker.Item
                      key={category.key}
                      label={category.label}
                      value={category.key}
                    />
                  ))}
                </Picker>
              </View>

              <ThemedText style={styles.modalLabel}>詳細（任意）</ThemedText>
              <TextInput
                value={reportDetail}
                onChangeText={setReportDetail}
                multiline
                placeholder="詳細を入力してください"
                placeholderTextColor="#888"
                style={[
                  styles.reportInput,
                  {
                    color: textColor,
                    borderColor,
                    backgroundColor,
                  },
                ]}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsReportModalOpen(false)}
                style={[styles.modalActionButton, { borderColor }]}
                disabled={isReportingSubmitting}
              >
                <ThemedText>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                onPress={submitAccountReport}
                style={[styles.modalActionButton, styles.modalActionPrimary]}
                disabled={isReportingSubmitting}
              >
                <ThemedText style={styles.modalActionPrimaryText}>
                  {isReportingSubmitting ? "送信中..." : "通報する"}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, gap: 12 },
  subtle: { opacity: 0.7 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerWrap: { width: "100%" },
  banner: { width: "100%", height: 140 },
  plate: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    right: 2,
    bottom: 2,
    zIndex: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  nameBlock: { flex: 1, minWidth: 0 },
  actionButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badges: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeIcon: { width: 16, height: 16 },
  badgeText: { fontSize: 12, maxWidth: 140 },
  profile: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
  },
  keyValues: { gap: 6, marginTop: 6 },
  keyValue: { flexDirection: "row", gap: 10 },
  key: { width: 72, opacity: 0.8 },
  value: { flex: 1 },
  counters: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  counter: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  accountTabs: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  accountTabActive: {},
  accountTabDisabled: { opacity: 0.55 },
  centerPad: { padding: 16, alignItems: "center" },
  footer: { paddingHorizontal: 16, paddingVertical: 16 },
  loadMore: {
    alignSelf: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  menuMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  menuDangerButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dangerText: {
    color: "#d93838",
  },
  reportBody: {
    maxHeight: 280,
  },
  modalLabel: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 4,
  },
  pickerWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
  },
  reportInput: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  modalActions: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalActionPrimary: {
    backgroundColor: "#d93838",
    borderColor: "#d93838",
  },
  modalActionPrimaryText: {
    color: "#fff",
  },
});
