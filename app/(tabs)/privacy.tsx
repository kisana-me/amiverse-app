import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function PrivacyScreen() {
  const borderColor = useThemeColor({}, "icon");
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">プライバシーポリシー</ThemedText>
      </MainHeader>

      <ThemedView style={styles.container}>
        <Pressable
          onPress={() => openBrowserAsync("https://anyur.com/privacy-policy")}
          style={[styles.button, { borderColor }]}
        >
          <ThemedText>Webページを開く</ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16 },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
});
