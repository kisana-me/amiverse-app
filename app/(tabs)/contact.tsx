import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function ContactScreen() {
  const borderColor = useThemeColor({}, "icon");
  return (
    <>
      <MainHeader>
        <ThemedText type="defaultSemiBold">お問い合わせ</ThemedText>
      </MainHeader>

      <ThemedView style={styles.container}>
        <Pressable
          onPress={() => openBrowserAsync("https://anyur.com/contact")}
          style={[styles.button, { borderColor }]}
        >
          <ThemedText>Webページを開く</ThemedText>
        </Pressable>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
});
