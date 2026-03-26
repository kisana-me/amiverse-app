import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { AccountOneLine } from "@/features/account";
import { api } from "@/lib/axios";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";
import { AccountType } from "@/types/account";
import { EmojiType } from "@/types/emoji";
import { Image } from "expo-image";

type ReactionType = {
  account: AccountType;
  emoji: EmojiType;
};

function normalizeReactionsPayload(data: unknown): {
  reactions: ReactionType[];
  emojis: EmojiType[];
} {
  const empty = {
    reactions: [] as ReactionType[],
    emojis: [] as EmojiType[],
  };

  if (!data || typeof data !== "object") return empty;

  const pick = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return empty;
    const reactionsRaw = (payload as { reactions?: unknown }).reactions;
    const emojisRaw = (payload as { emojis?: unknown }).emojis;
    return {
      reactions: Array.isArray(reactionsRaw)
        ? (reactionsRaw as ReactionType[])
        : [],
      emojis: Array.isArray(emojisRaw) ? (emojisRaw as EmojiType[]) : [],
    };
  };

  if ("reactions" in (data as object) || "emojis" in (data as object)) {
    return pick(data);
  }

  if ("data" in (data as object)) {
    const nested = (data as { data?: unknown }).data;
    return pick(nested);
  }

  return empty;
}

export default function PostReactionsUsersScreen() {
  const tintColor = useColors().link_color;
  const borderColor = useColors().border_color;
  const params = useLocalSearchParams<{ aid?: string }>();
  const aid = (params.aid ?? "").toString();
  const { currentAccountStatus } = useCurrentAccount();
  const { addToast } = useToast();

  const [reactions, setReactions] = useState<ReactionType[]>([]);
  const [emojis, setEmojis] = useState<EmojiType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmojiNameId, setSelectedEmojiNameId] = useState<string | null>(
    null,
  );

  const fetchReactions = useCallback(async () => {
    if (!aid) {
      setReactions([]);
      setLoading(false);
      return;
    }

    if (currentAccountStatus === "loading") return;

    setLoading(true);
    try {
      const payload: { emoji_name_id?: string } = {};
      if (selectedEmojiNameId) {
        payload.emoji_name_id = selectedEmojiNameId;
      }

      const res = await api.post(`/posts/${aid}/reactions`, payload);
      const normalized = normalizeReactionsPayload(res.data);

      setReactions(normalized.reactions);
      setEmojis((prev) => (prev.length > 0 ? prev : normalized.emojis));
    } catch (error) {
      addToast({
        message: "リアクションユーザー取得エラー",
        detail: error instanceof Error ? error.message : String(error),
      });
      setReactions([]);
    } finally {
      setLoading(false);
    }
  }, [aid, addToast, currentAccountStatus, selectedEmojiNameId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">リアクションしたユーザー</ThemedText>
      </MainHeader>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsScroll, { borderBottomColor: borderColor }]}
        contentContainerStyle={styles.tabsContainer}
      >
        <Pressable
          onPress={() => setSelectedEmojiNameId(null)}
          style={[
            styles.tab,
            {
              borderBottomColor:
                selectedEmojiNameId === null ? tintColor : "transparent",
            },
          ]}
        >
          <ThemedText
            type="defaultSemiBold"
            style={{ opacity: selectedEmojiNameId === null ? 1 : 0.7 }}
          >
            すべて
          </ThemedText>
        </Pressable>
        {emojis.map((emoji) => {
          const selected = selectedEmojiNameId === emoji.name_id;
          return (
            <Pressable
              key={emoji.name_id}
              onPress={() => setSelectedEmojiNameId(emoji.name_id)}
              style={[
                styles.tab,
                { borderBottomColor: selected ? tintColor : "transparent" },
              ]}
            >
              {emoji.image_url ? (
                <Image
                  source={{ uri: emoji.image_url }}
                  style={styles.tabImage}
                />
              ) : (
                <ThemedText style={styles.tabEmoji}>{emoji.name}</ThemedText>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

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
          style={styles.list}
          data={reactions}
          keyExtractor={(item, index) =>
            `${item.account.aid}-${item.emoji.name_id}-${index}`
          }
          renderItem={({ item }) => (
            <AccountOneLine
              account={item.account}
              trailing={
                item.emoji.image_url ? (
                  <Image
                    source={{ uri: item.emoji.image_url }}
                    style={styles.itemImage}
                  />
                ) : (
                  <ThemedText style={styles.itemEmoji}>
                    {item.emoji.name}
                  </ThemedText>
                )
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.listEmpty}>
              <ThemedText style={styles.subtle}>
                まだリアクションされていません
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
  tabsScroll: {
    height: 44,
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabsContainer: {
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tab: {
    height: 44,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabImage: {
    width: 22,
    height: 22,
  },
  tabEmoji: {
    fontSize: 18,
  },
  list: {
    flex: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  listEmpty: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  subtle: { opacity: 0.7, textAlign: "center" },
  itemEmoji: {
    fontSize: 20,
  },
  itemImage: {
    width: 24,
    height: 24,
  },
});
