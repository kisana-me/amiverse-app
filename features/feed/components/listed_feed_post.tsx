import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ListedPost } from "@/features/post";
import { formatRelativeTime } from "@/lib/format_time";
import { useColors } from "@/providers/UIProvider";
import { FeedItemType } from "@/types/feed";
import { PostType } from "@/types/post";

type ListedFeedPostProps = {
  post: PostType;
  feedItem?: FeedItemType;
};

export default function ListedFeedPost({
  post,
  feedItem,
}: ListedFeedPostProps) {
  const colors = useColors();
  const isDiffuse = feedItem?.type === "diffuse" && !!feedItem.account;

  return (
    <View>
      {isDiffuse ? (
        <View style={styles.diffuseRow}>
          <Image
            source={{
              uri:
                feedItem.account?.icon_url || "https://github.com/shadcn.png",
            }}
            style={styles.diffuseIcon}
          />

          <Link href={`/account/${feedItem.account?.name_id}`} asChild>
            <Pressable style={styles.nameWrap}>
              <ThemedText style={styles.diffuseName} numberOfLines={1}>
                {feedItem.account?.name}
              </ThemedText>
            </Pressable>
          </Link>

          <ThemedText
            style={[
              styles.diffuseMeta,
              { color: colors.inconspicuous_font_color },
            ]}
            numberOfLines={1}
          >
            @{feedItem.account?.name_id}
          </ThemedText>

          <ThemedText
            style={[
              styles.diffuseMeta,
              { color: colors.inconspicuous_font_color },
            ]}
            numberOfLines={1}
          >
            {feedItem.created_at
              ? formatRelativeTime(new Date(feedItem.created_at))
              : ""}
          </ThemedText>

          <ThemedText
            style={[
              styles.diffuseLabel,
              { color: colors.inconspicuous_font_color },
            ]}
          >
            拡散
          </ThemedText>
        </View>
      ) : null}

      <ListedPost {...post} />
    </View>
  );
}

const styles = StyleSheet.create({
  diffuseRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  diffuseIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  nameWrap: {
    maxWidth: 120,
  },
  diffuseName: {
    fontSize: 13,
    fontWeight: "700",
  },
  diffuseMeta: {
    fontSize: 12,
    opacity: 0.9,
    flexShrink: 1,
  },
  diffuseLabel: {
    marginLeft: "auto",
    fontSize: 12,
  },
});
