import MainHeader from "@/components/main_header/MainHeader";
import { ThemedText } from "@/components/themed-text";
import SkeletonTrendList from "@/components/trend/skeleton_trend";
import TrendList from "@/components/trend/trend_list";
import { useTrends } from "@/providers/TrendsProvider";
import { useColors } from "@/providers/UIProvider";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useScrollToTop } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function DiscoveryScreen() {
  const { trends, trendsLoading } = useTrends();
  const [searchInput, setSearchInput] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);
  useScrollToTop(scrollRef);
  const tabBarHeight = useBottomTabBarHeight();

  const borderColor = useColors().border_color;
  const textColor = useColors().font_color;

  const handleSearchClick = useCallback(() => {
    const q = searchInput.trim();
    if (!q) return;
    router.push({ pathname: "/search", params: { query: '"' + q + '"' } });
  }, [searchInput]);

  return (
    <>
      <MainHeader>
        <View style={styles.searchRow}>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="検索ワードを入力"
            placeholderTextColor={borderColor}
            style={[styles.searchInput, { borderColor, color: textColor }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearchClick}
          />
          <Pressable
            onPress={handleSearchClick}
            style={[styles.searchButton, { borderColor }]}
            accessibilityRole="button"
            accessibilityLabel="検索"
          >
            <ThemedText style={[styles.searchIcon, { color: borderColor }]}>
              🔎
            </ThemedText>
          </Pressable>
        </View>
      </MainHeader>

      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: 36 }]}
        keyboardShouldPersistTaps="handled"
      >
        {trendsLoading ? (
          <>{<SkeletonTrendList />}</>
        ) : (
          <>
            {trends.map((trend, index) => (
              <TrendList
                {...trend}
                key={`${trend.category}:${trend.title}:${index}`}
              />
            ))}
          </>
        )}

        {!trendsLoading && trends.length === 0 && (
          <View style={styles.noTrends}>
            <ThemedText>トレンドはありません</ThemedText>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingHorizontal: 8,
  },
  searchInput: {
    flexGrow: 1,
    flexShrink: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 16,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchIcon: {
    fontSize: 16,
    lineHeight: 16,
  },
  body: {
    flex: 1,
  },
  bodyContent: {},
  noTrends: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
