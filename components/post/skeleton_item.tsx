import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useColors } from "@/providers/UIProvider";

export default function Item() {
  const skeletonColor = useColors().border_color;

  return (
    <ThemedView style={styles.item}>
      <View
        style={[styles.box, { backgroundColor: skeletonColor, height: 54 }]}
      />

      <View style={styles.infoRow}>
        <View
          style={[
            styles.box,
            { backgroundColor: skeletonColor, width: 40, height: 18 },
          ]}
        />
        <View
          style={[
            styles.box,
            { backgroundColor: skeletonColor, width: 60, height: 18 },
          ]}
        />
      </View>

      <View
        style={[styles.box, { backgroundColor: skeletonColor, height: 28 }]}
      />

      <View style={styles.infoRow}>
        <View
          style={[
            styles.box,
            { backgroundColor: skeletonColor, width: 60, height: 18 },
          ]}
        />
        <View
          style={[
            styles.box,
            { backgroundColor: skeletonColor, width: 60, height: 18 },
          ]}
        />
      </View>

      <View
        style={[
          styles.box,
          { backgroundColor: skeletonColor, width: 80, height: 24 },
        ]}
      />
      <View
        style={[styles.box, { backgroundColor: skeletonColor, height: 26 }]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  box: {
    width: "100%",
    borderRadius: 6,
    opacity: 0.15,
  },
});
