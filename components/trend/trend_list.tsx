import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatRelativeTime } from "@/lib/format_time";
import { TrendType } from "@/types/trend";

export default function TrendList(trend: TrendType) {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const secondaryColor = useThemeColor({}, "icon");

  const onPressWord = useCallback((word: string) => {
    const q = word.trim();
    if (!q) return;
    router.push({ pathname: "/search", params: { query: q } });
  }, []);

  return (
    <ThemedView style={styles.card}>
      <View style={styles.top}>
        {trend.image_url ? (
          <Image
            source={{ uri: trend.image_url }}
            style={styles.topImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.topImage, { backgroundColor }]} />
        )}

        <View style={[styles.topOverlay, { backgroundColor }]}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {trend.title}
          </ThemedText>
          <ThemedText style={styles.overview}>{trend.overview}</ThemedText>
        </View>
      </View>

      <View style={styles.list}>
        {trend.ranking.map((t, index) => (
          <Pressable
            key={`${t.word}:${index}`}
            onPress={() => onPressWord(t.word)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={`${t.word} を検索`}
          >
            <ThemedText style={[styles.itemTop, { color: secondaryColor }]}>
              {index + 1}位
            </ThemedText>
            <ThemedText style={[styles.itemWord, { color: textColor }]}>
              {t.word}
            </ThemedText>
            <ThemedText style={[styles.itemBottom, { color: secondaryColor }]}>
              {t.count}件
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.bottom}>
        <ThemedText style={[styles.meta, { color: secondaryColor }]}>
          Category: {trend.category || "general"}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: secondaryColor }]}>
          Last updated at: {formatRelativeTime(trend.last_updated_at)}
        </ThemedText>
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
  topImage: {
    width: "100%",
    height: "100%",
  },
  topOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    opacity: 0.92,
  },
  title: {
    marginBottom: 4,
  },
  overview: {
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    paddingVertical: 8,
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  itemTop: {
    fontSize: 12,
  },
  itemWord: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemBottom: {
    fontSize: 12,
  },
  bottom: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
});
