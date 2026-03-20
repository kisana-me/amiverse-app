import React from "react";
import { StyleSheet } from "react-native";

import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function CommunitiesScreen() {
  return (
    <>
      <MainHeader>
        <ThemedText type="defaultSemiBold">コミュニティ</ThemedText>
      </MainHeader>
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">実装中</ThemedText>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
