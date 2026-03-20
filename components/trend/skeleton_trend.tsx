import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const isShort = h.length === 3;
  const r = parseInt(isShort ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(isShort ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(isShort ? h[2] + h[2] : h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function SkeletonTrendList() {
  const icon = useThemeColor({}, "icon");
  const skeleton = hexToRgba(icon, 0.18);

  return (
    <ThemedView style={styles.card}>
      <View style={[styles.top, { backgroundColor: skeleton }]} />

      <View style={styles.list}>
        {Array.from({ length: 10 }).map((_, idx) => (
          <View key={idx} style={styles.item}>
            <View style={[styles.lineSm, { backgroundColor: skeleton }]} />
            <View style={[styles.lineMd, { backgroundColor: skeleton }]} />
            <View style={[styles.lineXs, { backgroundColor: skeleton }]} />
          </View>
        ))}
      </View>

      <View style={styles.bottom}>
        <View style={[styles.lineSm, { backgroundColor: skeleton }]} />
        <View style={[styles.lineMd, { backgroundColor: skeleton }]} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  top: {
    width: "100%",
    aspectRatio: 2,
  },
  list: {
    paddingVertical: 8,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  bottom: {
    paddingHorizontal: 8,
    paddingBottom: 12,
    gap: 8,
  },
  lineXs: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  lineSm: {
    width: 100,
    height: 12,
    borderRadius: 4,
  },
  lineMd: {
    width: 180,
    height: 14,
    borderRadius: 4,
  },
});
