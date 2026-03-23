import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Linking,
    StyleSheet,
    Text,
    View,
    type GestureResponderEvent,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface PostContentProps {
  content: string;
}

export default function PostContent({ content }: PostContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tintColor = useThemeColor({}, "tint");
  const normalizedContent = content ?? "";
  const lines = useMemo(
    () => normalizedContent.split(/\r?\n/),
    [normalizedContent],
  );
  const isLongContent = normalizedContent.length > 600;
  const isManyLines = lines.length > 16;
  const shouldTruncate = isLongContent || isManyLines;

  const displayLines = useMemo(() => {
    if (!shouldTruncate || isExpanded) return lines;

    let textToShow = normalizedContent;

    if (isManyLines) {
      textToShow = lines.slice(0, 16).join("\n");
    }

    if (textToShow.length > 600) {
      textToShow = `${textToShow.substring(0, 600)}...`;
    }

    return textToShow.split(/\r?\n/);
  }, [isExpanded, isManyLines, lines, normalizedContent, shouldTruncate]);

  if (!normalizedContent) return null;

  const handleLinkPress = async (url: string, e?: GestureResponderEvent) => {
    e?.stopPropagation();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      // Ignore failures to open external links to keep post rendering stable.
    }
  };

  const handleMentionPress = (
    mentionText: string,
    e?: GestureResponderEvent,
  ) => {
    e?.stopPropagation();

    let href = mentionText;
    if (!href.startsWith("@")) {
      href = `@${href}`;
    }

    const nameId = href.slice(1);
    if (!nameId) return;

    router.push({
      pathname: "/account/[name_id]",
      params: { name_id: nameId },
    });
  };

  const handleHashtagPress = (tagText: string, e?: GestureResponderEvent) => {
    e?.stopPropagation();
    router.push({ pathname: "/search", params: { query: tagText } });
  };

  const parseLine = (line: string, lineIndex: number) => {
    if (line === "") {
      return [""];
    }

    const regex =
      /(https?:\/\/[^\s]+)|((?:^|\s)(?:@)?[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+)|((?:^|\s)@[a-zA-Z0-9_]{1,100})|((?:^|\s)#[^\s]{1,250})/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      const urlMatch = match[1];
      const remoteMentionMatch = match[2];
      const simpleMentionMatch = match[3];
      const hashtagMatch = match[4];

      if (urlMatch) {
        parts.push(
          <Text
            key={`${lineIndex}-${match.index}`}
            style={[styles.linkText, { color: tintColor }]}
            suppressHighlighting
            onPress={(e) => {
              void handleLinkPress(urlMatch, e);
            }}
          >
            {urlMatch}
          </Text>,
        );
      } else if (remoteMentionMatch || simpleMentionMatch) {
        const text = remoteMentionMatch || simpleMentionMatch || "";
        const trimmed = text.trim();
        const leadingSpace = text.substring(0, text.indexOf(trimmed));

        if (leadingSpace) {
          parts.push(leadingSpace);
        }

        parts.push(
          <Text
            key={`${lineIndex}-${match.index}`}
            style={[styles.linkText, { color: tintColor }]}
            suppressHighlighting
            onPress={(e) => handleMentionPress(trimmed, e)}
          >
            {trimmed}
          </Text>,
        );
      } else if (hashtagMatch) {
        const trimmed = hashtagMatch.trim();
        const leadingSpace = hashtagMatch.substring(
          0,
          hashtagMatch.indexOf("#"),
        );

        if (leadingSpace) {
          parts.push(leadingSpace);
        }

        parts.push(
          <Text
            key={`${lineIndex}-${match.index}`}
            style={[styles.linkText, { color: tintColor }]}
            suppressHighlighting
            onPress={(e) => handleHashtagPress(trimmed, e)}
          >
            {trimmed}
          </Text>,
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [line];
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.text}>
        {displayLines.map((line, index) => (
          <React.Fragment key={`${index}-${line.length}`}>
            {parseLine(line, index)}
            {index < displayLines.length - 1 ? "\n" : null}
          </React.Fragment>
        ))}
      </ThemedText>

      {shouldTruncate && !isExpanded && (
        <ThemedText
          style={[styles.moreText, { color: tintColor }]}
          onPress={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
        >
          もっと見る
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 0,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  linkText: {
    textDecorationLine: "none",
  },
  moreText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
});
