import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColors } from "@/providers/UIProvider";

type SlideItem = {
  key: string;
  title: string;
  body: string;
  mediaType: "image" | "video";
  mediaSource: number;
};

const SLIDES: SlideItem[] = [
  {
    key: "1",
    title: "Amiverseへようこそ",
    body: "好きな投稿を見つけて、気になる人の投稿を追いかけられます。面白い投稿をしてみよう！",
    mediaType: "image",
    mediaSource: require("../assets/images/post.png"),
  },
  {
    key: "2",
    title: "ドット絵でコミュニケーション",
    body: "投稿に320×120の白黒ドット絵を描いて添付できます。手書きのやりとりを楽しもう！",
    mediaType: "video",
    mediaSource: require("../assets/videos/drawing.mp4"),
  },
  {
    key: "3",
    title: "リアクションで気軽に気持ちを伝えよう",
    body: "投稿には絵文字でリアクション出来ます。投稿にあった絵文字をいち早く選んで反応しよう！",
    mediaType: "video",
    mediaSource: require("../assets/videos/reaction.mp4"),
  },
];

type OnboardingVideoProps = {
  source: number;
  active: boolean;
};

function OnboardingVideo({ source, active }: OnboardingVideoProps) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  useEffect(() => {
    try {
      if (active) {
        player.play();
        return;
      }

      player.pause();
    } catch {
      // Ignore transient native race conditions during setup.
    }
  }, [active, player]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // Ignore race conditions during unmount.
      }
    };
  }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const isFromSettings = params.from === "settings";
  const colors = useColors();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<SlideItem> | null>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const buttonLabel = isLast ? "始める" : "次へ";

  const pagination = useMemo(() => {
    return SLIDES.map((slide, dotIndex) => {
      const active = dotIndex === index;
      return (
        <View
          key={slide.key}
          style={[
            styles.dot,
            {
              backgroundColor: active
                ? colors.link_color
                : colors.inconspicuous_background_color,
              width: active ? 20 : 8,
            },
          ]}
        />
      );
    });
  }, [colors.inconspicuous_background_color, colors.link_color, index]);

  const onPressNext = () => {
    if (isLast) {
      if (isFromSettings) {
        router.back();
        return;
      }
      router.push("/onboarding-permission" as any);
      return;
    }

    const nextIndex = index + 1;
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setIndex(nextIndex);
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      setIndex(Math.max(0, Math.min(next, SLIDES.length - 1)));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={listRef}
        style={styles.slidesList}
        data={SLIDES}
        extraData={index}
        horizontal
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item, index: itemIndex }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.mediaWrapper}>
              {item.mediaType === "image" ? (
                <Image
                  source={item.mediaSource}
                  style={styles.media}
                  contentFit="contain"
                />
              ) : (
                <OnboardingVideo
                  source={item.mediaSource}
                  active={itemIndex === index}
                />
              )}
            </View>
            <ThemedText type="title" style={styles.title}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.body}>{item.body}</ThemedText>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>{pagination}</View>
        <Pressable
          onPress={onPressNext}
          style={[
            styles.cta,
            {
              borderColor: colors.link_color,
              backgroundColor: colors.link_color,
            },
          ]}
        >
          <ThemedText
            style={{ color: colors.button_font_color, fontWeight: "700" }}
          >
            {buttonLabel}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slidesList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 14,
  },
  mediaWrapper: {
    flex: 1,
    width: "100%",
    minHeight: 220,
    borderRadius: 16,
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  title: {
    lineHeight: 42,
  },
  body: {
    fontSize: 17,
    lineHeight: 27,
    opacity: 0.88,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    gap: 16,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  cta: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
});
