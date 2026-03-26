import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { AccountOneLine } from "@/features/account";
import { api } from "@/lib/axios";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";
import { AccountType } from "@/types/account";

function normalizeAccounts(data: unknown): AccountType[] {
  if (!data || typeof data !== "object") return [];

  if ("accounts" in (data as object)) {
    const raw = (data as { accounts?: unknown }).accounts;
    return Array.isArray(raw) ? (raw as AccountType[]) : [];
  }

  if ("data" in (data as object)) {
    const nested = (data as { data?: unknown }).data;
    if (nested && typeof nested === "object" && "accounts" in nested) {
      const raw = (nested as { accounts?: unknown }).accounts;
      return Array.isArray(raw) ? (raw as AccountType[]) : [];
    }
  }

  return [];
}

export default function PostDiffusesUsersScreen() {
  const params = useLocalSearchParams<{ aid?: string }>();
  const aid = (params.aid ?? "").toString();
  const { currentAccountStatus } = useCurrentAccount();
  const { addToast } = useToast();

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDiffusions = useCallback(async () => {
    if (!aid) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    if (currentAccountStatus === "loading") return;

    setLoading(true);
    try {
      const res = await api.post(`/posts/${aid}/diffusions`);
      setAccounts(normalizeAccounts(res.data));
    } catch (error) {
      addToast({
        message: "拡散ユーザー取得エラー",
        detail: error instanceof Error ? error.message : String(error),
      });
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [aid, addToast, currentAccountStatus]);

  useEffect(() => {
    fetchDiffusions();
  }, [fetchDiffusions]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">拡散したユーザー</ThemedText>
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
          data={accounts}
          keyExtractor={(item) => item.aid}
          renderItem={({ item }) => <AccountOneLine account={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText style={styles.subtle}>
                まだ拡散されていません
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
