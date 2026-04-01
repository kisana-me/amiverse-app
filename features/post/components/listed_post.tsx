import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Image as RNImage, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DrawingViewer } from "@/features/drawing";
import { MediaViewer, type MediaViewerItem } from "@/features/media_viewer";
import { formatRelativeTime } from "@/lib/format_time";
import { useColors } from "@/providers/UIProvider";

import { PostType } from "@/types/post";
import PostAccount from "./account";
import PostConsole from "./console";
import PostContent from "./content";
import PostMediaGrid from "./media_grid";
import PostQuote from "./quote";
import PostReactions from "./reactions";

export default function Post(post: PostType) {
  const tint = useColors().link_color;
  const backgroundColor = useColors().background_color;
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
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const mediaViewerItems = useMemo<MediaViewerItem[]>(() => {
    return (post.media ?? []).map((media) => ({
      id: `media-${media.aid}`,
      uri: media.url,
      name: media.name,
      description: media.description,
    }));
  }, [post.media]);

  const drawingViewerItems = useMemo<MediaViewerItem[]>(() => {
    return (post.drawings ?? []).map((drawing) => ({
      id: `drawing-${drawing.aid}`,
      uri: drawing.image_url,
      name: drawing.name,
      description: drawing.description,
      pixelPerfect: true,
    }));
  }, [post.drawings]);

  const viewerItems = useMemo<MediaViewerItem[]>(() => {
    return [...mediaViewerItems, ...drawingViewerItems];
  }, [drawingViewerItems, mediaViewerItems]);

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

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const openPost = () => {
    const href = {
      pathname: "/post/[aid]" as const,
      params: {
        aid: post.aid,
      },
    };
    router.push(href as any);
  };

  return (
    <Pressable onPress={openPost}>
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
            <PostMediaGrid
              media={post.media}
              stopPropagation
              onPressMedia={(index) => {
                openViewer(index);
              }}
            />
          )}

          {post.drawings && post.drawings.length > 0 && (
            <View style={styles.drawingsContainer}>
              {post.drawings.map((drawing) => (
                <Pressable
                  key={drawing.aid}
                  onPress={(event) => {
                    event.stopPropagation();
                    const drawingIndex = drawingViewerItems.findIndex(
                      (item) => item.id === `drawing-${drawing.aid}`,
                    );
                    if (drawingIndex < 0) return;
                    openViewer(mediaViewerItems.length + drawingIndex);
                  }}
                >
                  <LinearGradient
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
                      <DrawingViewer
                        uri={drawing.image_url}
                        style={[
                          styles.drawingImage,
                          {
                            aspectRatio: drawingAspectRatios[drawing.aid] ?? 1,
                          },
                        ]}
                      />
                    </View>
                  </LinearGradient>
                </Pressable>
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

      <MediaViewer
        visible={viewerVisible}
        items={viewerItems}
        initialIndex={viewerIndex}
        onClose={() => {
          setViewerVisible(false);
        }}
      />
    </Pressable>
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
