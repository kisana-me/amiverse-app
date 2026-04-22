import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { clearAccessToken } from "@/lib/access-token";
import { api } from "@/lib/axios";
import { useAccounts } from "@/providers/AccountsProvider";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useFeeds } from "@/providers/FeedsProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { usePosts } from "@/providers/PostsProvider";
import { useToast } from "@/providers/ToastProvider";
import { useTrends } from "@/providers/TrendsProvider";
import { useColors } from "@/providers/UIProvider";

export default function LeaveSettingsScreen() {
  const borderColor = useColors().border_color;
  const backgroundColor = useColors().background_color;
  const dangerColor = useColors().accent_color;
  const { reloadCurrentAccount } = useCurrentAccount();

  const { addToast } = useToast();
  const {
    currentAccount,
    currentAccountStatus,
    setCurrentAccount,
    setCurrentAccountStatus,
  } = useCurrentAccount();
  const { clearAccounts } = useAccounts();
  const { clearFeeds } = useFeeds();
  const { clearPosts } = usePosts();
  const { clearNotifications } = useNotifications();
  const { clearTrends } = useTrends();

  const redirectedRef = useRef(false);
  const suppressSignedOutRedirectRef = useRef(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (
      currentAccountStatus === "signed_out" &&
      !redirectedRef.current &&
      !suppressSignedOutRedirectRef.current
    ) {
      redirectedRef.current = true;
      addToast({ message: "エラー", detail: "サインインしてください" });
      router.replace("/signin" as any);
    }
  }, [addToast, currentAccountStatus]);

  const clearAppCache = useCallback(() => {
    clearAccounts();
    clearFeeds();
    clearPosts();
    clearNotifications();
    clearTrends();
  }, [clearAccounts, clearFeeds, clearNotifications, clearPosts, clearTrends]);

  const handleLeave = useCallback(async () => {
    if (currentAccountStatus !== "signed_in" || !currentAccount) {
      addToast({
        message: "退会できませんでした",
        detail: "サインインしていません",
      });
      return;
    }

    if (isLeaving) return;

    setIsLeaving(true);
    try {
      await api.delete("/settings/leave");
      suppressSignedOutRedirectRef.current = true;
      await clearAccessToken();
      delete api.defaults.headers.common["Authorization"];
      delete api.defaults.headers.common["X-CSRF-Token"];

      clearAppCache();
      setCurrentAccount(null);
      setCurrentAccountStatus("signed_out");

      setIsConfirmModalOpen(false);
      reloadCurrentAccount();
      router.replace("/" as any);
      addToast({
        message: "退会しました",
        detail: "ご利用ありがとうございました。",
      });
    } catch (error) {
      addToast({
        message: "退会できませんでした",
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLeaving(false);
    }
  }, [
    addToast,
    clearAppCache,
    currentAccount,
    currentAccountStatus,
    isLeaving,
    setCurrentAccount,
    setCurrentAccountStatus,
  ]);

  if (currentAccountStatus === "loading") {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <MainHeader>
          <ThemedText type="defaultSemiBold">アカウント削除</ThemedText>
        </MainHeader>
        <ThemedView style={styles.center}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (currentAccountStatus === "signed_out") {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">アカウント削除</ThemedText>
      </MainHeader>

      <ThemedView style={styles.container}>
        <ThemedView style={[styles.noticeCard, { borderColor: dangerColor }]}>
          <ThemedText type="defaultSemiBold" style={{ color: dangerColor }}>
            退会すると、すべてのデータが削除されます
          </ThemedText>
          <ThemedText style={styles.noticeBody}>
            投稿、プロフィール、通知などのデータは完全に削除され、元に戻せません。
          </ThemedText>
          <ThemedText style={styles.noticeBody}>
            内容を確認のうえ、必要なデータがある場合は事前に保存してください。
          </ThemedText>
        </ThemedView>

        <Pressable
          onPress={() => setIsConfirmModalOpen(true)}
          disabled={isLeaving}
          style={({ pressed }) => [
            styles.leaveButton,
            {
              backgroundColor: dangerColor,
              borderColor: dangerColor,
              opacity: isLeaving ? 0.65 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <ThemedText style={styles.leaveButtonText}>
            {isLeaving ? "退会処理中..." : "アカウントを削除する"}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <Modal
        visible={isConfirmModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isLeaving) setIsConfirmModalOpen(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <ThemedView
            style={[styles.modalCard, { borderColor, backgroundColor }]}
          >
            <ThemedText type="subtitle">最終確認</ThemedText>
            <ThemedText style={styles.modalBody}>
              本当に退会しますか？この操作は取り消せません。
            </ThemedText>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsConfirmModalOpen(false)}
                disabled={isLeaving}
                style={[styles.modalButton, { borderColor }]}
              >
                <ThemedText>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleLeave}
                disabled={isLeaving}
                style={[
                  styles.modalButton,
                  { borderColor: dangerColor, backgroundColor: dangerColor },
                ]}
              >
                <ThemedText style={styles.modalPrimaryText}>
                  {isLeaving ? "処理中..." : "退会する"}
                </ThemedText>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 16,
  },
  noticeCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  noticeBody: {
    opacity: 0.86,
    lineHeight: 20,
  },
  leaveButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  leaveButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  modalBody: {
    opacity: 0.86,
    lineHeight: 20,
  },
  modalActions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 96,
    alignItems: "center",
  },
  modalPrimaryText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
