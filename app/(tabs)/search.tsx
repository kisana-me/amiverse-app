import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ query?: string }>();
  const query = useMemo(() => (params.query ?? "").toString(), [params.query]);

  return (
    <>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">検索</ThemedText>
          <ThemedText onPress={() => router.back()} style={styles.back}>
            戻る
          </ThemedText>
        </View>

        <ThemedText>query: {query || "(empty)"}</ThemedText>
        <ThemedText style={styles.note}>検索画面は未実装です。</ThemedText>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  back: {
    fontSize: 14,
  },
  note: {
    marginTop: 8,
    opacity: 0.7,
  },
});
