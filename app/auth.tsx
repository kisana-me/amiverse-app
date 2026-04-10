import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { setAccessToken } from "@/lib/access-token";
import { api } from "@/lib/axios";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useToast } from "@/providers/ToastProvider";

const SESSION_CREATE_ENDPOINT = "sessions/create";
const MISSING_INPUT_GRACE_MS = 1200;

function extractCodeAndStateFromUrl(url: string): {
  code: string;
  state: string;
} {
  try {
    const parsed = new URL(url);
    return {
      code: parsed.searchParams.get("code") || "",
      state: parsed.searchParams.get("state") || "",
    };
  } catch {
    const query = url.split("?")[1]?.split("#")[0] ?? "";
    const params = new URLSearchParams(query);
    return {
      code: params.get("code") || "",
      state: params.get("state") || "",
    };
  }
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    code_verifier?: string;
    expected_state?: string;
    redirected_url?: string;
    redirect_uri?: string;
  }>();
  const { addToast } = useToast();
  const { reloadCurrentAccount } = useCurrentAccount();
  const [isWorking, setIsWorking] = useState(true);

  const authPayload = useMemo(() => {
    const redirectedUrl = params.redirected_url?.toString() ?? "";
    const redirectUri = params.redirect_uri?.toString() ?? "";

    const extractedFromUrl = redirectedUrl
      ? extractCodeAndStateFromUrl(redirectedUrl)
      : { code: "", state: "" };

    const code = (params.code?.toString() ?? "") || extractedFromUrl.code;
    const returnedState =
      (params.state?.toString() ?? "") || extractedFromUrl.state;
    const codeVerifier = params.code_verifier?.toString() ?? "";
    const expectedState = params.expected_state?.toString() ?? "";

    return {
      code,
      returnedState,
      expectedState,
      codeVerifier,
      redirectUri,
    };
  }, [
    params.code,
    params.state,
    params.code_verifier,
    params.expected_state,
    params.redirected_url,
    params.redirect_uri,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      try {
        if (!authPayload.code || !authPayload.codeVerifier) {
          setTimeout(() => {
            if (isCancelled) return;

            addToast({
              message: "サインインに失敗しました",
              detail: "認可コードまたはcode_verifierが見つかりませんでした",
            });
            router.replace("/signin");
          }, MISSING_INPUT_GRACE_MS);
          return;
        }

        if (
          authPayload.expectedState &&
          authPayload.returnedState &&
          authPayload.expectedState !== authPayload.returnedState
        ) {
          addToast({
            message: "サインインに失敗しました",
            detail: "stateの検証に失敗しました",
          });
          router.replace("/signin");
          return;
        }

        const response = await api.post<{
          status?: string;
          access_token?: string;
          expires_in?: number;
          new_account?: boolean;
        }>(SESSION_CREATE_ENDPOINT, {
          code: authPayload.code,
          code_verifier: authPayload.codeVerifier,
          redirect_uri: authPayload.redirectUri,
        });

        if (response.data.status !== "success") {
          throw new Error("セッション作成に失敗しました");
        }

        const accessToken = response.data.access_token ?? "";
        if (!accessToken) {
          throw new Error("アクセストークンが返されませんでした");
        }

        if (response.data.new_account) {
          addToast({
            message: "アカウントを作成しました",
            detail: "初回サインインとしてアカウントが自動作成されました",
          });
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
          message: "サインインに失敗しました",
          detail: error instanceof Error ? error.message : String(error),
        });
        router.replace("/signin");
      } finally {
        // If navigation succeeds, this screen will unmount. If it fails, show completion state.
        if (!isCancelled) setIsWorking(false);
      }
    };

    run();
    return () => {
      isCancelled = true;
    };
  }, [authPayload, addToast, reloadCurrentAccount]);

  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
