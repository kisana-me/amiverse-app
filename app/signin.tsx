import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import AnyurIcon from "@/components/anyur-icon";
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
  const colors = useColors();
  const borderColor = colors.border_color;
  const contentColor = colors.content_color;
  const shadowColor = colors.shadow_color;
  const buttonColor = colors.button_color;
  const buttonFontColor = colors.button_font_color;
  const inconspicuousFontColor = colors.inconspicuous_font_color;
  const inconspicuousBackgroundColor = colors.inconspicuous_background_color;
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
        <View
          style={[
            styles.heroCard,
            {
              borderColor,
              backgroundColor: contentColor,
              shadowColor,
            },
          ]}
        >
          <View
            style={[
              styles.badge,
              {
                borderColor,
                backgroundColor: inconspicuousBackgroundColor,
              },
            ]}
          >
            <AnyurIcon size={14} />
            <ThemedText
              style={[styles.badgeText, { color: inconspicuousFontColor }]}
            >
              ANYUR
            </ThemedText>
          </View>

          <ThemedText style={styles.heroTitle}>Amiverseに参加</ThemedText>

          <ThemedText
            style={[styles.heroDescription, { color: inconspicuousFontColor }]}
          >
            ANYURアカウントでAmiverseに参加できます。
          </ThemedText>

          <View style={styles.bulletList}>
            <ThemedText
              style={[styles.bulletItem, { color: inconspicuousFontColor }]}
            >
              - ここからサインイン(ログイン)できます
            </ThemedText>
            <ThemedText
              style={[styles.bulletItem, { color: inconspicuousFontColor }]}
            >
              - 初めての場合、サインアップ(新規登録)されます
            </ThemedText>
            <ThemedText
              style={[styles.bulletItem, { color: inconspicuousFontColor }]}
            >
              - ANYURアカウント(無料)が必須です
            </ThemedText>
          </View>
        </View>

        <ThemedText
          style={[styles.hintText, { color: inconspicuousFontColor }]}
        >
          ボタンを押すとAmiverseの利用規約・プライバシーポリシーに同意したことになります。
        </ThemedText>

        <Pressable
          onPress={openSignin}
          style={({ pressed }) => [
            styles.button,
            {
              borderColor,
              backgroundColor: buttonColor,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <AnyurIcon size={20} />
          <ThemedText style={[styles.buttonText, { color: buttonFontColor }]}>
            ANYURで続ける
          </ThemedText>
        </Pressable>

        <ThemedText
          style={[styles.hintText, { color: inconspicuousFontColor }]}
        >
          認可完了後は自動でこのアプリに戻ります。
        </ThemedText>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
    justifyContent: "center",
  },
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  bulletList: {
    gap: 6,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
