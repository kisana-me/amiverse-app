import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";

WebBrowser.maybeCompleteAuthSession();

const ANYUR_AUTHORIZE_URL = "https://anyur.com/oauth/authorize";
const OAUTH_REDIRECT_URI = "amiverse://auth";
const OAUTH_SCOPE =
  "persona_aid name name_id description birthdate subscription";
const PKCE_CHALLENGE_METHOD = "S256";

function createRandomString(length = 64): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  try {
    const random = Crypto.getRandomBytes(length);
    return Array.from(random, (value) => chars[value % chars.length]).join("");
  } catch {
    // Fallback for environments where native RNG is unexpectedly unavailable.
  }

  let value = "";
  while (value.length < length) {
    value += Math.random().toString(36).slice(2);
  }

  return value.slice(0, length);
}

async function buildCodeChallenge(codeVerifier: string): Promise<string> {
  const digestBase64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    {
      encoding: Crypto.CryptoEncoding.BASE64,
    },
  );

  return digestBase64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const query = new URLSearchParams({
    response_type: "code",
    client_id: "Amiverse",
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: OAUTH_SCOPE,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: PKCE_CHALLENGE_METHOD,
  });

  return `${ANYUR_AUTHORIZE_URL}?${query.toString()}`;
}

export default function SigninScreen() {
  const borderColor = useColors().border_color;
  const { addToast } = useToast();

  const openSignin = useCallback(async () => {
    try {
      const codeVerifier = createRandomString();
      const state = createRandomString(32);
      const codeChallenge = await buildCodeChallenge(codeVerifier);
      const url = buildAuthorizeUrl({ state, codeChallenge });

      const result = await WebBrowser.openAuthSessionAsync(
        url,
        OAUTH_REDIRECT_URI,
      );
      if (result.type !== "success" || !result.url) return;

      router.replace({
        pathname: "/auth",
        params: {
          redirected_url: result.url,
          code_verifier: codeVerifier,
          expected_state: state,
          redirect_uri: OAUTH_REDIRECT_URI,
        },
      });
    } catch (error) {
      addToast({
        message: "サインインを開始できませんでした",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [addToast]);

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
