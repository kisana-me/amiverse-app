import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { setAccessToken } from "@/lib/access-token";
import { api } from "@/lib/axios";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";

function extractTokenFromUrl(url: string): string {
  // Supports both query (`?access_token=...`) and fragment (`#access_token=...`).
  const parts = url.split("#");
  const queryPart = parts[0] ?? "";
  const fragmentPart = parts[1] ?? "";

  const queryToken = (() => {
    try {
      const parsed = new URL(queryPart);
      return (
        parsed.searchParams.get("access_token") ||
        parsed.searchParams.get("token") ||
        ""
      );
    } catch {
      return "";
    }
  })();

  if (queryToken) return queryToken;

  const fragmentParams = new URLSearchParams(fragmentPart);
  return (
    fragmentParams.get("access_token") || fragmentParams.get("token") || ""
  );
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    access_token?: string;
    token?: string;
    redirected_url?: string;
  }>();
  const { addToast } = useToast();
  const { reloadCurrentAccount } = useCurrentAccount();
  const [isWorking, setIsWorking] = useState(true);

  const accessToken = useMemo(() => {
    const direct = (params.access_token ?? params.token)?.toString() ?? "";
    if (direct) return direct;

    const redirectedUrl = params.redirected_url?.toString() ?? "";
    if (redirectedUrl) return extractTokenFromUrl(redirectedUrl);

    return "";
  }, [params.access_token, params.token, params.redirected_url]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      try {
        if (!accessToken) {
          addToast({
            message: "サインインに失敗しました",
            detail: "アクセストークンが見つかりませんでした",
          });
          router.replace("/signin");
          return;
        }

        await setAccessToken(accessToken);
        if (isCancelled) return;

        // Ensure /start immediately sees the token even if interceptor timing is odd.
        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

        await reloadCurrentAccount();
        if (isCancelled) return;
        setTimeout(() => router.replace("/"), 0);
      } catch (error) {
        addToast({
          message: "リロードに失敗しました",
          detail: error instanceof Error ? error.message : String(error),
        });
        router.replace("/");
      } finally {
        // If navigation succeeds, this screen will unmount. If it fails, show completion state.
        if (!isCancelled) setIsWorking(false);
      }
    };

    run();
    return () => {
      isCancelled = true;
    };
  }, [accessToken, addToast, reloadCurrentAccount]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">サインイン</ThemedText>
      </MainHeader>
      <ThemedView style={styles.container}>
        <View style={styles.row}>
          <ActivityIndicator />
          <ThemedText>
            {isWorking ? "認証中..." : "処理が完了しました"}
          </ThemedText>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
