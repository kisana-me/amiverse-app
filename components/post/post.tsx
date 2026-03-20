import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { Image as RNImage, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatRelativeTime } from "@/lib/format_time";

import ItemAccount from "./item_account";
import ItemConsole from "./item_console";
import ItemContent from "./item_content";
import ItemQuote from "./item_quote";
import ItemReactions from "./item_reactions";

import { PostType } from "@/types/post";

export default function Post(post: PostType) {
  const tint = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");
  const drawingBorderColor = tint;

  const drawingBorderColors = useMemo(
    () =>
      [
        "rgb(236, 121, 121)",
        "rgb(236, 236, 121)",
        "rgb(121, 236, 121)",
        "rgb(121, 236, 236)",
        "rgb(121, 121, 236)",
        "rgb(236, 121, 236)",
        "rgb(236, 121, 121)",
      ] as const,
    [],
  );

  const [drawingAspectRatios, setDrawingAspectRatios] = useState<
    Record<string, number>
  >({});

  const drawingUrls = useMemo(
    () => post.drawings?.map((d) => ({ aid: d.aid, url: d.image_url })) ?? [],
    [post.drawings],
  );

  useEffect(() => {
    let cancelled = false;

    for (const { aid, url } of drawingUrls) {
      if (!url) continue;
      if (drawingAspectRatios[aid]) continue;

      RNImage.getSize(
        url,
        (width, height) => {
          if (cancelled) return;
          const ratio = height > 0 ? width / height : 1;
          setDrawingAspectRatios((prev) =>
            prev[aid] ? prev : { ...prev, [aid]: ratio },
          );
        },
        () => {
          if (cancelled) return;
          setDrawingAspectRatios((prev) =>
            prev[aid] ? prev : { ...prev, [aid]: 1 },
          );
        },
      );
    }

    return () => {
      cancelled = true;
    };
  }, [drawingUrls, drawingAspectRatios]);

  return (
    <ThemedView style={styles.item}>
      <ItemAccount account={post.account} />

      <View style={styles.timeRow}>
        <ThemedText style={styles.timeText}>
          {formatRelativeTime(new Date(post.created_at))}
        </ThemedText>
      </View>

      <View style={styles.content}>
        <ItemContent content={post.content} />

        {post.media && post.media.length > 0 && (
          <View style={styles.mediaContainer}>
            {post.media.map((media) => (
              <Image
                key={media.aid}
                source={{ uri: media.url }}
                style={styles.mediaImage}
                contentFit="cover"
              />
            ))}
          </View>
        )}

        {post.drawings && post.drawings.length > 0 && (
          <View style={styles.drawingsContainer}>
            {post.drawings.map((drawing) => (
              <LinearGradient
                key={drawing.aid}
                colors={drawingBorderColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.drawingFrame}
              >
                <View
                  style={[
                    styles.drawingInner,
                    { backgroundColor, borderColor: drawingBorderColor },
                  ]}
                >
                  <Image
                    source={{ uri: drawing.image_url }}
                    style={[
                      styles.drawingImage,
                      { aspectRatio: drawingAspectRatios[drawing.aid] ?? 1 },
                    ]}
                    contentFit="contain"
                  />
                </View>
              </LinearGradient>
            ))}
          </View>
        )}
      </View>

      <ItemQuote quote={post.quote} />
      <ItemReactions post={post} />
      <ItemConsole post={post} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  timeRow: {
    marginTop: 0,
    width: "100%",
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  content: {
    marginLeft: 0,
  },
  mediaContainer: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    gap: 8,
  },
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  drawingsContainer: {
    marginTop: 8,
    width: "100%",
    gap: 8,
  },
  drawingFrame: {
    width: "100%",
    padding: 1,
  },
  drawingInner: {
    width: "100%",
    borderWidth: 0,
  },
  drawingImage: {
    width: "100%",
    borderRadius: 0,
  },
  footer: {
    marginTop: 8,
    marginLeft: 50,
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
});
