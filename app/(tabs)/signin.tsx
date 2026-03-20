import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useToast } from "@/providers/ToastProvider";

WebBrowser.maybeCompleteAuthSession();

const SIGNIN_URL = "https://amiverse.net/app/signin";

export default function SigninScreen() {
  const borderColor = useThemeColor({}, "icon");
  useToast();

  const openSignin = useCallback(async () => {
    const redirectUri = Linking.createURL("auth");
    const url = `${SIGNIN_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;

    const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
    if (result.type !== "success" || !result.url) return;

    router.replace({
      pathname: "/auth",
      params: { redirected_url: result.url },
    });
  }, []);

  return (
    <>
      <MainHeader>
        <ThemedText type="defaultSemiBold">サインイン</ThemedText>
      </MainHeader>

      <ThemedView style={styles.container}>
        <ThemedText>
          ブラウザでサインインし、アプリに戻ってください。
        </ThemedText>
        <Pressable
          onPress={openSignin}
          style={[styles.button, { borderColor }]}
        >
          <ThemedText>サインインを開く</ThemedText>
        </Pressable>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
});
