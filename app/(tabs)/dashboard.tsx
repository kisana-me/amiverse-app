import { useScrollToTop } from "@react-navigation/native";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { clearAccessToken } from "@/lib/access-token";
import { api } from "@/lib/axios";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";

function ActionCard({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress?: () => void;
}) {
  const borderColor = useThemeColor({}, "icon");
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, { borderColor, opacity: onPress ? 1 : 0.6 }]}
    >
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <ThemedText style={styles.cardDesc}>{description}</ThemedText>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  useScrollToTop(scrollRef);

  const borderColor = useThemeColor({}, "icon");
  const backgroundColor = useThemeColor({}, "background");
  const { addToast } = useToast();
  const {
    currentAccount,
    currentAccountStatus,
    setCurrentAccount,
    setCurrentAccountStatus,
  } = useCurrentAccount();

  const [isSignoutModalOpen, setIsSignoutModalOpen] = useState(false);

  const isSignedIn = currentAccountStatus === "signed_in" && !!currentAccount;
  const displayName = useMemo(() => {
    if (currentAccountStatus === "loading") return "読み込み中...";
    return currentAccount?.name || "ゲスト";
  }, [currentAccount?.name, currentAccountStatus]);

  const handleSignout = useCallback(async () => {
    if (!isSignedIn) {
      addToast({
        message: "サインアウトできませんでした",
        detail: "サインインしていません",
      });
      return;
    }
    try {
      await api.delete("/signout");
      await clearAccessToken();
      delete api.defaults.headers.common["Authorization"];
      setCurrentAccount(null);
      setCurrentAccountStatus("signed_out");
      addToast({ message: "サインアウトしました" });
    } catch (error) {
      addToast({
        message: "サインアウトできませんでした",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [addToast, isSignedIn, setCurrentAccount, setCurrentAccountStatus]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">ダッシュボード</ThemedText>
      </MainHeader>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <ThemedView style={[styles.profileCard, { borderColor }]}>
          <View style={styles.banner}>
            {currentAccount?.banner_url ? (
              <Image
                source={{ uri: currentAccount.banner_url }}
                style={styles.bannerImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.bannerPlaceholder, { backgroundColor }]} />
            )}
          </View>

          <View style={styles.profileContent}>
            <View style={[styles.avatarWrap, { borderColor, backgroundColor }]}>
              {currentAccount?.icon_url ? (
                <Image
                  source={{ uri: currentAccount.icon_url }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <ThemedText style={styles.avatarEmoji}>👤</ThemedText>
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.profileHeaderRow}>
                <View style={styles.names}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {displayName}
                  </ThemedText>
                  <ThemedText style={styles.subtle} numberOfLines={1}>
                    @{currentAccount?.name_id || "unknown"}
                  </ThemedText>
                </View>

                <View style={styles.profileButtons}>
                  <Pressable
                    onPress={() =>
                      isSignedIn
                        ? router.push("/settings/account" as any)
                        : router.push("/signin")
                    }
                    style={[styles.smallButton, { borderColor }]}
                  >
                    <ThemedText style={styles.smallButtonText}>
                      {isSignedIn ? "編集" : "サインイン"}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push("/settings")}
                    style={[styles.smallButton, { borderColor }]}
                  >
                    <ThemedText style={styles.smallButtonText}>設定</ThemedText>
                  </Pressable>
                </View>
              </View>

              <ThemedText style={styles.description}>
                {currentAccount?.description ||
                  "自己紹介文がまだ設定されていません。"}
              </ThemedText>

              <View style={[styles.statsRow, { borderColor }]}>
                <View style={styles.stat}>
                  <ThemedText type="defaultSemiBold">
                    {currentAccount?.followers_count ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.subtle}>フォロワー</ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText type="defaultSemiBold">
                    {currentAccount?.following_count ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.subtle}>フォロー中</ThemedText>
                </View>
                <View style={styles.stat}>
                  <ThemedText type="defaultSemiBold">
                    {currentAccount?.posts_count ?? 0}
                  </ThemedText>
                  <ThemedText style={styles.subtle}>投稿</ThemedText>
                </View>
              </View>
            </View>
          </View>
        </ThemedView>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          機能
        </ThemedText>
        <View style={styles.grid}>
          <ActionCard
            title="お絵かき"
            description="みんなのを見る"
            onPress={() => router.push("/")}
          />
          <ActionCard
            title="絵文字"
            description="みんなのを見る"
            onPress={() => router.push("/")}
          />
          <ActionCard title="お財布" description="実装予定" />
          <ActionCard title="現在地" description="実装予定" />
          <ActionCard title="コレクション" description="実装予定" />
          <ActionCard title="アチーブメント" description="実装予定" />
        </View>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          操作
        </ThemedText>
        <View style={styles.actions}>
          <Pressable
            onPress={() => setIsSignoutModalOpen(true)}
            style={[styles.actionButton, { borderColor }]}
          >
            <ThemedText>サインアウト</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={isSignoutModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSignoutModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <ThemedView style={styles.modalCard}>
            <ThemedText type="subtitle">サインアウト確認</ThemedText>
            <ThemedText style={styles.modalBody}>
              本当にサインアウトしますか？
            </ThemedText>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsSignoutModalOpen(false)}
                style={styles.modalButton}
              >
                <ThemedText>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                onPress={async () => {
                  setIsSignoutModalOpen(false);
                  await handleSignout();
                }}
                style={[
                  styles.modalButton,
                  styles.modalPrimary,
                  { borderColor },
                ]}
              >
                <ThemedText>サインアウト</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 28 },
  profileCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: "hidden",
  },
  banner: { width: "100%", height: 120 },
  bannerImage: { width: "100%", height: "100%" },
  bannerPlaceholder: { width: "100%", height: "100%", opacity: 0.6 },
  profileContent: { padding: 16, paddingTop: 0, flexDirection: "row", gap: 12 },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginTop: -40,
    borderWidth: 3,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 28 },
  profileInfo: { flex: 1, paddingTop: 8, gap: 10 },
  profileHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  names: { flex: 1 },
  subtle: { opacity: 0.7, fontSize: 12, marginTop: 2 },
  profileButtons: { flexDirection: "row", gap: 8 },
  smallButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallButtonText: { fontSize: 12 },
  description: { opacity: 0.9 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
  },
  stat: { alignItems: "center", flex: 1 },
  sectionTitle: { marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  cardDesc: { fontSize: 12, opacity: 0.75 },
  actions: { gap: 10 },
  actionButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
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
  modalBody: { marginTop: 8, opacity: 0.8 },
  modalActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: { paddingVertical: 8, paddingHorizontal: 12 },
  modalPrimary: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
});
