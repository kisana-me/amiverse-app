import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ListedPost } from "@/features/post";
import { api } from "@/lib/axios";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";
import { PostType } from "@/types/post";

function normalizePosts(data: unknown): PostType[] {
  if (!data || typeof data !== "object") return [];

  if ("posts" in (data as object)) {
    const raw = (data as { posts?: unknown }).posts;
    return Array.isArray(raw) ? (raw as PostType[]) : [];
  }

  if ("quotes" in (data as object)) {
    const raw = (data as { quotes?: unknown }).quotes;
    return Array.isArray(raw) ? (raw as PostType[]) : [];
  }

  if ("data" in (data as object)) {
    const nested = (data as { data?: unknown }).data;
    if (!nested || typeof nested !== "object") return [];

    if ("posts" in nested) {
      const raw = (nested as { posts?: unknown }).posts;
      return Array.isArray(raw) ? (raw as PostType[]) : [];
    }

    if ("quotes" in nested) {
      const raw = (nested as { quotes?: unknown }).quotes;
      return Array.isArray(raw) ? (raw as PostType[]) : [];
    }
  }

  return [];
}

export default function PostQuotesUsersScreen() {
  const params = useLocalSearchParams<{ aid?: string }>();
  const aid = (params.aid ?? "").toString();
  const { currentAccountStatus } = useCurrentAccount();
  const { addToast } = useToast();

  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    if (!aid) {
      setPosts([]);
      setLoading(false);
      return;
    }

    if (currentAccountStatus === "loading") return;

    setLoading(true);
    try {
      const res = await api.post(`/posts/${aid}/quotes`);
      setPosts(normalizePosts(res.data));
    } catch (error) {
      addToast({
        message: "引用取得エラー",
        detail: error instanceof Error ? error.message : String(error),
      });
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [aid, addToast, currentAccountStatus]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">引用したユーザー</ThemedText>
      </MainHeader>

      {!aid ? (
        <View style={styles.center}>
          <ThemedText style={styles.subtle}>
            投稿IDが指定されていません
          </ThemedText>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <ThemedText style={styles.subtle}>読み込み中...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.aid}
          renderItem={({ item }) => <ListedPost {...item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText style={styles.subtle}>
                まだ引用されていません
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  subtle: { opacity: 0.7, textAlign: "center" },
});
