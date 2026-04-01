import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { PostType } from "@/types/post";

type PostMedia = NonNullable<PostType["media"]>[number];

type PostMediaGridProps = {
  media: PostMedia[];
  onPressMedia: (index: number) => void;
  stopPropagation?: boolean;
};

export default function PostMediaGrid({
  media,
  onPressMedia,
  stopPropagation = false,
}: PostMediaGridProps) {
  const shouldSplit = media.length >= 2;

  return (
    <View
      style={[styles.mediaContainer, shouldSplit && styles.mediaContainerSplit]}
    >
      {media.map((mediaItem, index) => (
        <Pressable
          key={mediaItem.aid}
          style={[
            styles.mediaPressable,
            shouldSplit ? styles.mediaPressableHalf : styles.mediaPressableFull,
          ]}
          onPress={(event) => {
            if (stopPropagation) {
              event.stopPropagation();
            }
            onPressMedia(index);
          }}
        >
          <Image
            source={{ uri: mediaItem.url }}
            style={styles.mediaImage}
            contentFit="cover"
          />
          {mediaItem.type === "video" ? (
            <View style={styles.videoBadge} pointerEvents="none">
              <Ionicons name="play" size={12} color="#fff" />
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaContainer: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  mediaContainerSplit: {
    marginHorizontal: -2,
  },
  mediaPressable: {
    overflow: "hidden",
  },
  mediaPressableFull: {
    width: "100%",
  },
  mediaPressableHalf: {
    width: "50%",
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  mediaImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  videoBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.68)",
  },
});
