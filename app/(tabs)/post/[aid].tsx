import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ aid?: string }>();
  const aid = (params.aid ?? "").toString();

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <MainHeader>
        <ThemedText type="defaultSemiBold">投稿</ThemedText>
      </MainHeader>

      <ThemedView style={styles.container}>
        <ThemedText>投稿詳細（未実装）</ThemedText>
        <ThemedText style={styles.subtle}>aid: {aid || "(missing)"}</ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16, gap: 8 },
  subtle: { opacity: 0.7 },
});
