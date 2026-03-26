import { router, useLocalSearchParams, useNavigation } from "expo-router";
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
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FeaturedPost, ListedPost } from "@/features/post";
import { api } from "@/lib/axios";
import { usePosts } from "@/providers/PostsProvider";
import { useToast } from "@/providers/ToastProvider";
import { PostType } from "@/types/post";

function normalizePostResponse(data: unknown): PostType | null {
  const payload =
    data && typeof data === "object" && "data" in (data as object)
      ? (data as { data?: unknown }).data
      : data;

  if (!payload || typeof payload !== "object") return null;

  if ("post" in (payload as object)) {
    const nested = (payload as { post?: unknown }).post;
    if (nested && typeof nested === "object" && "aid" in (nested as object)) {
      return nested as PostType;
    }
  }

  if ("aid" in (payload as object)) {
    return payload as PostType;
  }

  return null;
}

function collectRelatedPosts(root: PostType): PostType[] {
  const queue: PostType[] = [root];
  const seen = new Set<string>();
  const result: PostType[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (!current.aid || seen.has(current.aid)) continue;

    seen.add(current.aid);
    result.push(current);

    if (current.reply) queue.push(current.reply);
    if (current.quote) queue.push(current.quote);
    if (current.replies && current.replies.length > 0) {
      queue.push(...current.replies);
    }
  }

  return result;
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ aid?: string; from?: string }>();
  const navigation = useNavigation();
  const aid = (params.aid ?? "").toString();
  const source = params.from === "thread" ? "thread" : "timeline";
  const { height: windowHeight } = useWindowDimensions();
  const { getPost, addPosts } = usePosts();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState<PostType | null>(null);
  const [parentHeaderHeight, setParentHeaderHeight] = useState(0);

  const listRef = useRef<FlatList<PostType>>(null);
  const skipNextBeforeRemoveRef = useRef(false);
  const currentOffsetRef = useRef(0);
  const appliedParentHeightRef = useRef(0);

  const cachedPost = useMemo(
    () => (aid ? getPost(aid) : undefined),
    [aid, getPost],
  );

  const fetchPostDetail = useCallback(async () => {
    if (!aid) return;

    setLoading(true);
    try {
      const attempts = [() => api.post(`/posts/${aid}`)];

      let resolved: PostType | null = null;
      for (const attempt of attempts) {
        try {
          const res = await attempt();
          resolved = normalizePostResponse(res.data);
          if (resolved) break;
        } catch {
          // try next endpoint shape
        }
      }

      if (!resolved) {
        addToast({
          message: "投稿取得エラー",
          detail: "投稿の取得に失敗しました",
        });
        return;
      }

      addPosts(collectRelatedPosts(resolved));
      setPost(resolved);
    } finally {
      setLoading(false);
    }
  }, [aid, addPosts, addToast]);

  useEffect(() => {
    if (!aid) return;

    const unsub = navigation.addListener("beforeRemove", (event) => {
      if (skipNextBeforeRemoveRef.current) return;
      if (source !== "timeline") return;

      const actionType = event.data.action.type;
      const isBackAction =
        actionType === "GO_BACK" ||
        actionType === "POP" ||
        actionType === "POP_TO_TOP";

      if (!isBackAction) return;

      event.preventDefault();
      skipNextBeforeRemoveRef.current = true;
      router.replace("/");
      requestAnimationFrame(() => {
        skipNextBeforeRemoveRef.current = false;
      });
    });

    return unsub;
  }, [aid, navigation, source]);

  useEffect(() => {
    if (!aid) return;
    currentOffsetRef.current = 0;
    appliedParentHeightRef.current = 0;
    setParentHeaderHeight(0);
  }, [aid]);

  useEffect(() => {
    if (!aid) return;
    if (!cachedPost) return;
    setPost(cachedPost);
  }, [aid, cachedPost]);

  useEffect(() => {
    if (!aid) return;
    fetchPostDetail();
  }, [aid, fetchPostDetail]);

  useEffect(() => {
    if (!post?.reply) return;
    if (parentHeaderHeight <= 0) return;

    const delta = parentHeaderHeight - appliedParentHeightRef.current;
    if (Math.abs(delta) < 1) return;

    requestAnimationFrame(() => {
      const nextOffset = Math.max(0, currentOffsetRef.current + delta);
      listRef.current?.scrollToOffset({
        offset: nextOffset,
        animated: false,
      });
      currentOffsetRef.current = nextOffset;
      appliedParentHeightRef.current = parentHeaderHeight;
    });
  }, [parentHeaderHeight, post?.reply]);

  const parentReplyForView = useMemo(() => {
    const reply = post?.reply;
    if (!reply?.aid) return undefined;
    return getPost(reply.aid) ?? reply;
  }, [getPost, post?.reply]);

  const replies = post?.replies ?? [];

  return (
    <>
      <MainHeader>
        <ThemedText type="defaultSemiBold">投稿</ThemedText>
      </MainHeader>

      <ThemedView style={styles.container}>
        {!aid ? (
          <ThemedText>投稿IDが指定されていません</ThemedText>
        ) : loading && !post ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <ThemedText>読み込み中...</ThemedText>
          </View>
        ) : post ? (
          <FlatList
            ref={listRef}
            data={replies}
            keyExtractor={(item) => item.aid}
            renderItem={({ item }) => (
              <ListedPost {...item} navigationMode="push" />
            )}
            onScroll={(event) => {
              currentOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: windowHeight }}
            ListHeaderComponent={
              <View>
                {parentReplyForView ? (
                  <View
                    onLayout={(event) => {
                      const nextHeight = event.nativeEvent.layout.height;
                      if (!Number.isFinite(nextHeight)) return;
                      setParentHeaderHeight((prev) =>
                        Math.abs(prev - nextHeight) < 1 ? prev : nextHeight,
                      );
                    }}
                  >
                    <ListedPost {...parentReplyForView} navigationMode="push" />
                  </View>
                ) : null}
                <FeaturedPost {...post} />
              </View>
            }
            ListFooterComponent={<View style={{ height: windowHeight }} />}
            ListEmptyComponent={
              <View style={styles.emptyReplies}>
                <ThemedText style={styles.subtle}>
                  返信はまだありません
                </ThemedText>
              </View>
            }
          />
        ) : (
          <ThemedText>投稿を取得できませんでした</ThemedText>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  emptyReplies: { paddingVertical: 16 },
  subtle: { opacity: 0.7 },
});
