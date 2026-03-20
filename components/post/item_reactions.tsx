import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { EmojiType } from "@/types/emoji";
import { PostType } from "@/types/post";

export default function ItemReactions({ post }: { post: PostType }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={[
            styles.reactionButton,
            post.is_reacted && styles.reactedButton,
          ]}
        >
          <View style={styles.icon}>
            <Svg
              viewBox="0 0 100 100"
              width={16}
              height={16}
              fill="currentColor"
              color={post.is_reacted ? "#e0245e" : "#666"}
            >
              <Path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M76 11H70V24H57V30H70V43H76V30H89V24H76V11ZM50 27C50 21.5581 51.8899 16.5576 55.0492 12.6192C52.7609 12.2123 50.4052 12 48 12C25.9086 12 8 29.9086 8 52C8 74.0914 25.9086 92 48 92C70.0914 92 88 74.0914 88 52C88 49.5948 87.7877 47.2391 87.3808 44.9508C83.4424 48.1101 78.4419 50 73 50C60.2975 50 50 39.7025 50 27ZM36 34C32.6863 34 30 36.6863 30 40C30 43.3137 32.6863 46 36 46C39.3137 46 42 43.3137 42 40C42 36.6863 39.3137 34 36 34ZM32.8247 59C32.3692 59 32 59.3693 32 59.8247C32 68.2058 38.7942 75 47.1753 75H51.8247C60.2058 75 67 68.2058 67 59.8247C67 59.3693 66.6308 59 66.1753 59H32.8247Z"
              />
            </Svg>
          </View>
          <ThemedText
            style={[styles.count, post.is_reacted && styles.reactedCount]}
          >
            {post.reactions_count || 0}
          </ThemedText>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
        >
          {post.reactions?.map((reaction: EmojiType) => (
            <TouchableOpacity
              key={reaction.aid}
              style={[
                styles.emojiButton,
                reaction.reacted && styles.reactedButton,
              ]}
            >
              <ThemedText style={styles.emoji}>{reaction.name}</ThemedText>
              <ThemedText
                style={[styles.count, reaction.reacted && styles.reactedCount]}
              >
                {reaction.reactions_count}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginLeft: 0,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderRadius: 16,
    marginRight: 8,
  },
  emojiButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginRight: 6,
  },
  reactedButton: {
    backgroundColor: "#ffebee",
  },
  icon: {
    marginRight: 4,
  },
  count: {
    fontSize: 12,
    color: "#666",
  },
  reactedCount: {
    color: "#e0245e",
  },
  scroll: {
    flexGrow: 0,
  },
  emoji: {
    fontSize: 14,
    marginRight: 4,
  },
});
