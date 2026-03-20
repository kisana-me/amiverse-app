import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { PostType } from "@/types/post";

export default function ItemQuote({ quote }: { quote?: PostType }) {
  if (!quote) return null;

  const { account } = quote;

  return (
    <View style={styles.container}>
      <Link href={`/`} asChild>
        <TouchableOpacity style={styles.content}>
          <View style={styles.header}>
            <Image
              source={{
                uri: account.icon_url || "https://github.com/shadcn.png",
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
              • {new Date(quote.created_at).toLocaleDateString()}
            </ThemedText>
          </View>
          <ThemedText style={styles.text} numberOfLines={3}>
            {quote.content}
          </ThemedText>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginLeft: 0,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
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
