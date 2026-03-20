import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { Image as RNImage, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatRelativeTime } from "@/lib/format_time";

import { PostType } from "@/types/post";
import PostAccount from "./item_account";
import PostConsole from "./post_console";
import PostContent from "./post_content";
import PostQuote from "./post_quote";
import PostReactions from "./post_reactions";

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

  const strVisibility = (v: string) =>
    ({
      opened: "全体公開",
      closed: "非公開",
      limited: "限定公開",
      followers_only: "フォロワー公開",
      direct_only: "直接公開",
    })[v] ?? "公開状態不明";

  return (
    <ThemedView style={styles.post}>
      <PostAccount account={post.account} />

      <View style={styles.postInfo}>
        <View>
          <ThemedText style={styles.infoText}>
            {post.reply_presence ? "返信" : ""}
            {post.quote_presence && (post.reply_presence ? "・引用" : "引用")}
          </ThemedText>
        </View>
        <View>
          <ThemedText style={styles.infoText}>
            {formatRelativeTime(new Date(post.created_at))}
          </ThemedText>
        </View>
      </View>

      <View style={styles.content}>
        <PostContent content={post.content} />

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

      <PostQuote quote={post.quote} />

      <View style={styles.postInfo}>
        <View>
          <ThemedText style={styles.infoText}>
            {strVisibility(post.visibility)}
          </ThemedText>
        </View>
        <View>
          <ThemedText style={styles.infoText}>
            {post.views_count}回表示
          </ThemedText>
        </View>
      </View>

      <PostReactions post={post} />
      <PostConsole post={post} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  post: {
    padding: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  postInfo: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoText: {
    fontSize: 10,
    opacity: 0.5,
  },
  content: {},
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
