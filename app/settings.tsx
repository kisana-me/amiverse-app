import { router } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { clearAccessToken } from "@/lib/access-token";
import { api } from "@/lib/axios";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";

export default function SettingsScreen() {
  const borderColor = useColors().border_color;
  const backgroundColor = useColors().background_color;
  const tintColor = useColors().link_color;
  const { addToast } = useToast();
  const {
    currentAccount,
    currentAccountStatus,
    setCurrentAccount,
    setCurrentAccountStatus,
  } = useCurrentAccount();

  const isSignedIn = currentAccountStatus === "signed_in" && !!currentAccount;

  const openExternal = useCallback(
    async (url: string) => {
      try {
        await openBrowserAsync(url);
      } catch (error) {
        addToast({
          message: "エラー",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [addToast],
  );

  const handleSignout = useCallback(async () => {
    if (!isSignedIn) {
      addToast({
        message: "サインアウトできません",
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
    <>
      <MainHeader>
        <ThemedText type="defaultSemiBold">設定</ThemedText>
      </MainHeader>

      <ThemedView style={styles.container}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">アカウント</ThemedText>
          {isSignedIn ? (
            <>
              <Pressable
                onPress={() => openExternal("https://amiverse.net/")}
                style={[styles.rowButton, { borderColor }]}
              >
                <ThemedText>Web版を開く</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => router.push("/settings/account" as any)}
                style={[styles.rowButton, { borderColor }]}
              >
                <ThemedText>アカウント設定</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSignout}
                style={[
                  styles.rowButton,
                  { borderColor: tintColor, backgroundColor, opacity: 1 },
                ]}
              >
                <ThemedText style={{ color: tintColor }}>
                  サインアウト
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => openExternal("https://amiverse.net/")}
                style={[styles.rowButton, { borderColor }]}
              >
                <ThemedText>Web版を開く</ThemedText>
              </Pressable>
              <ThemedText style={styles.subtle}>
                サインインしていません
              </ThemedText>
            </>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">プライバシー</ThemedText>
          <Pressable
            onPress={() =>
              router.push("/onboarding-permission?from=settings" as any)
            }
            style={[styles.rowButton, { borderColor }]}
          >
            <ThemedText>トラッキング許可を確認・変更</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">ヘルプ</ThemedText>
          <Pressable
            onPress={() => openExternal("https://anyur.com/terms-of-service")}
            style={[styles.rowButton, { borderColor }]}
          >
            <ThemedText>利用規約を開く</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => openExternal("https://anyur.com/privacy-policy")}
            style={[styles.rowButton, { borderColor }]}
          >
            <ThemedText>プライバシーポリシーを開く</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => openExternal("https://anyur.com/contact")}
            style={[styles.rowButton, { borderColor }]}
          >
            <ThemedText>お問い合わせを開く</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  section: { gap: 10 },
  subtle: { opacity: 0.7 },
  rowButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
