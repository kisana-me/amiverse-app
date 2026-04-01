import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { formatRelativeTime } from "@/lib/format_time";
import { PostType } from "@/types/post";

export default function PostQuote({ quote }: { quote?: PostType }) {
  if (!quote) return null;

  const { account } = quote;
  const previewContent = (() => {
    const lines = (quote.content ?? "").split(/\r?\n/);
    if (lines.length <= 3) return quote.content;
    return `${lines.slice(0, 3).join("\n")}...`;
  })();

  return (
    <View style={styles.container}>
      <Link href={`/post/${quote.aid}`} asChild>
        <TouchableOpacity style={styles.content}>
          <View style={styles.header}>
            <Image
              source={{
                uri:
                  account.icon_url ||
                  "https://api.amiverse.net/static_assets/images/amiverse-logo.webp",
              }}
              style={styles.icon}
            />
            <ThemedText
              type="defaultSemiBold"
              style={styles.name}
              numberOfLines={1}
            >
              {account.name}
            </ThemedText>
            <ThemedText style={styles.nameId} numberOfLines={1}>
              @{account.name_id}
            </ThemedText>
            <ThemedText style={styles.date}>
              • {formatRelativeTime(new Date(quote.created_at))}
            </ThemedText>
          </View>
          <ThemedText
            style={styles.text}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {previewContent}
          </ThemedText>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 0,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  name: {
    fontSize: 14,
    marginRight: 4,
  },
  nameId: {
    fontSize: 12,
    color: "#666",
    marginRight: 4,
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
