import { router } from "expo-router";
import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import AccountOneLine from "@/features/account/components/one_line";
import { api } from "@/lib/axios";
import { CachedAccount, useAccounts } from "@/providers/AccountsProvider";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";

function FollowButton({ account }: { account: CachedAccount }) {
  const borderColor = useColors().border_color;
  const backgroundColor = useColors().background_color;
  const tintColor = useColors().link_color;
  const { currentAccountStatus, currentAccount } = useCurrentAccount();
  const { updateAccount } = useAccounts();
  const { addToast } = useToast();

  const isSignedIn = currentAccountStatus === "signed_in";
  const isSelf = currentAccount?.aid === account.aid;

  if (isSelf) return null;

  const handleFollow = async () => {
    if (!isSignedIn) {
      addToast({
        message: "フォローできません",
        detail: "サインインしてください",
      });
      router.push("/signin");
      return;
    }

    const isFollowing = !!account.is_following;
    const originalFollowersCount = account.followers_count ?? 0;

    updateAccount(account.name_id, {
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
      updateAccount(account.name_id, {
        is_following: isFollowing,
        followers_count: originalFollowersCount,
      });
      addToast({ message: "エラー", detail: "フォロー操作に失敗しました" });
    }
  };

  return (
    <Pressable
      onPress={() => void handleFollow()}
      style={({ pressed }) => [
        styles.followButton,
        {
          borderColor: account.is_following ? tintColor : borderColor,
          backgroundColor: account.is_following ? backgroundColor : tintColor,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <ThemedText
        style={{ color: account.is_following ? tintColor : backgroundColor }}
      >
        {account.is_following ? "フォロー中" : "フォロー"}
      </ThemedText>
    </Pressable>
  );
}

export default function CommunitiesScreen() {
  const { accounts } = useAccounts();

  const cachedAccounts = useMemo(() => {
    return Object.values(accounts).sort((a, b) => b.fetched_at - a.fetched_at);
  }, [accounts]);

  return (
    <>
      <MainHeader>
        <ThemedText type="defaultSemiBold">コミュニティ</ThemedText>
      </MainHeader>

      <FlatList
        data={cachedAccounts}
        keyExtractor={(item) => item.aid}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">最近見たアカウント</ThemedText>
            <ThemedText style={styles.subtle}>
              {cachedAccounts.length} 件
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <ThemedText style={styles.subtle}>
              最近見たアカウントはありません
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedView style={styles.itemWrap}>
            <AccountOneLine
              account={item}
              trailing={<FollowButton account={item} />}
            />
            <View style={styles.metaRow}>
              <ThemedText style={styles.subtle}>
                最終閲覧: {new Date(item.fetched_at).toLocaleString()}
              </ThemedText>
            </View>
          </ThemedView>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  header: {
    marginBottom: 4,
    gap: 4,
  },
  itemWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  metaRow: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  subtle: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
});
