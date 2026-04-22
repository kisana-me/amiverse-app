import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { markOnboardingCompleted } from "@/lib/onboarding";
import {
  getPersonalizationConsent,
  getTrackingPermissionStatus,
  openSystemSettings,
  requestTrackingPermissionIfNeeded,
  setPersonalizationConsent,
} from "@/lib/tracking-permission";
import { useToast } from "@/providers/ToastProvider";
import { useColors } from "@/providers/UIProvider";

type TrackingStatus = "denied" | "granted" | "undetermined";

export default function OnboardingPermissionScreen() {
  const colors = useColors();
  const { addToast } = useToast();
  const params = useLocalSearchParams<{ from?: string }>();
  const [status, setStatus] = useState<TrackingStatus | "loading">("loading");
  const [androidConsent, setAndroidConsent] = useState<"allow" | "deny" | null>(
    null,
  );

  const isFromSettings = params.from === "settings";
  const isIOS = Platform.OS === "ios";

  const refreshStatus = useCallback(async () => {
    try {
      if (!isIOS) {
        const storedConsent = await getPersonalizationConsent();
        setAndroidConsent(storedConsent);
        if (storedConsent === "allow") {
          setStatus("granted");
          return;
        }
        if (storedConsent === "deny") {
          setStatus("denied");
          return;
        }
        setStatus("undetermined");
        return;
      }

      const current = await getTrackingPermissionStatus();
      setStatus(current);
    } catch (error) {
      setStatus("denied");
      addToast({
        message: "許可状態の取得に失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [addToast, isIOS]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const statusText = useMemo(() => {
    if (status === "loading") return "現在: 読み込み中";

    if (!isIOS) {
      if (androidConsent === "allow") {
        return "現在: 許可する を選択済み";
      }
      if (androidConsent === "deny") {
        return "現在: 許可しない を選択済み";
      }
      return "現在: 未選択";
    }

    if (status === "granted") return "現在: 許可済み";
    if (status === "undetermined") return "現在: 未選択";
    return "現在: 許可されていません";
  }, [androidConsent, isIOS, status]);

  const descriptionText =
    "あなたに合ったおすすめの情報や広告を表示したり効果測定をするために必要な情報の追跡を、許可または拒否できます。拒否した場合でもアプリは利用できます。設定画面でいつでも変更できます。";

  const finishFlow = useCallback(async () => {
    if (!isFromSettings) {
      await markOnboardingCompleted();
      router.replace("/" as any);
      return;
    }

    router.back();
  }, [isFromSettings]);

  const handleAllow = useCallback(async () => {
    if (!isIOS) {
      await setPersonalizationConsent("allow");
      setAndroidConsent("allow");
      setStatus("granted");
      addToast({ message: "「許可する」を保存しました" });
      await finishFlow();
      return;
    }

    try {
      const next = await requestTrackingPermissionIfNeeded();
      if (next === "granted") {
        await setPersonalizationConsent("allow");
        setStatus("granted");
        addToast({ message: "許可が完了しました" });
        await finishFlow();
        return;
      }

      if (next === "denied") {
        await setPersonalizationConsent("deny");
        setStatus("denied");
        addToast({ message: "拒否を選択しました" });
        await finishFlow();
        return;
      }

      addToast({
        message: "選択が必要です",
        detail: "「許可」または「許可しない」を選択してください",
      });
      await refreshStatus();
    } catch (error) {
      addToast({
        message: "許可リクエストに失敗しました",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [addToast, finishFlow, isIOS, refreshStatus]);

  const handleDeny = useCallback(async () => {
    await setPersonalizationConsent("deny");
    setAndroidConsent("deny");
    setStatus("denied");
    addToast({ message: "「許可しない」を保存しました" });
    await finishFlow();
  }, [addToast, finishFlow]);

  const handleOpenSettings = useCallback(async () => {
    try {
      await openSystemSettings();
    } catch (error) {
      addToast({
        message: "設定を開けませんでした",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }, [addToast]);

  const handleContinue = useCallback(async () => {
    await finishFlow();
  }, [finishFlow]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          あなたに最適化されたデータ提供のため、追跡の許可を求めています
        </ThemedText>
        <ThemedText style={styles.description}>{descriptionText}</ThemedText>
        <ThemedText style={styles.status}>{statusText}</ThemedText>
      </View>

      <View style={styles.actions}>
        {isIOS ? (
          <>
            <Pressable
              onPress={handleAllow}
              style={[
                styles.primaryButton,
                {
                  borderColor: colors.link_color,
                  backgroundColor: colors.link_color,
                },
              ]}
            >
              <ThemedText
                style={{ color: colors.button_font_color, fontWeight: "700" }}
              >
                次へ
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleOpenSettings}
              style={[
                styles.secondaryButton,
                { borderColor: colors.border_color },
              ]}
            >
              <ThemedText>端末の設定を開く</ThemedText>
            </Pressable>

            {isFromSettings ? (
              <Pressable
                onPress={handleContinue}
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border_color },
                ]}
              >
                <ThemedText>設定に戻る</ThemedText>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Pressable
              onPress={handleAllow}
              style={[
                styles.primaryButton,
                {
                  borderColor: colors.link_color,
                  backgroundColor: colors.link_color,
                },
              ]}
            >
              <ThemedText
                style={{ color: colors.button_font_color, fontWeight: "700" }}
              >
                許可する
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDeny}
              style={[
                styles.secondaryButton,
                { borderColor: colors.border_color },
              ]}
            >
              <ThemedText>許可しない</ThemedText>
            </Pressable>

            {isFromSettings ? (
              <Pressable
                onPress={handleContinue}
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border_color },
                ]}
              >
                <ThemedText>設定に戻る</ThemedText>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 34,
  },
  content: {
    gap: 16,
  },
  title: {
    lineHeight: 42,
  },
  description: {
    fontSize: 17,
    lineHeight: 28,
    opacity: 0.88,
  },
  status: {
    marginTop: 8,
    opacity: 0.78,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
});
