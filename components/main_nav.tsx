import { router, usePathname } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/icons";
import { ThemedText } from "@/components/themed-text";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useFeeds } from "@/providers/FeedsProvider";
import { useColors } from "@/providers/UIProvider";

type TabItem = {
  href: string;
  icon: "index" | "discovery" | "dashboard" | "notifications" | "communities";
  iconFocused:
    | "index.fill"
    | "discovery.fill"
    | "dashboard.fill"
    | "notifications.fill"
    | "communities.fill";
};

const TABS: TabItem[] = [
  { href: "/", icon: "index", iconFocused: "index.fill" },
  { href: "/discovery", icon: "discovery", iconFocused: "discovery.fill" },
  { href: "/dashboard", icon: "dashboard", iconFocused: "dashboard.fill" },
  {
    href: "/notifications",
    icon: "notifications",
    iconFocused: "notifications.fill",
  },
  {
    href: "/communities",
    icon: "communities",
    iconFocused: "communities.fill",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav() {
  const pathname = usePathname();
  const colors = useColors();
  const { currentAccountStatus } = useCurrentAccount();
  const { currentFeedType } = useFeeds();

  const showSigninPrompt =
    pathname === "/" &&
    (currentFeedType === "index" || currentFeedType === "current") &&
    currentAccountStatus === "signed_out";

  return (
    <View style={styles.container}>
      {showSigninPrompt ? (
        <View
          style={[
            styles.signinPrompt,
            {
              backgroundColor: colors.blur_color,
              borderColor: colors.border_color,
            },
          ]}
        >
          <View style={styles.promptTextWrap}>
            <ThemedText style={styles.promptTitle}>
              Amiverseに参加しよう
            </ThemedText>
            <ThemedText style={styles.promptDescription} numberOfLines={2}>
              投稿やフォローなど、すべての機能をご利用いただけます
            </ThemedText>
          </View>

          <Pressable
            onPress={() => router.push("/signin")}
            style={styles.promptButton}
            accessibilityRole="button"
          >
            <ThemedText style={styles.promptButtonText}>サインイン</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.wrap, { backgroundColor: colors.background_color }]}>
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);

          return (
            <Pressable
              key={tab.href}
              onPress={() => {
                if (active) return;
                router.replace(tab.href as any);
              }}
              style={styles.tabButton}
              accessibilityRole="button"
            >
              <IconSymbol
                size={32}
                name={active ? tab.iconFocused : tab.icon}
                color={colors.font_color}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  wrap: {
    height: 64,
    borderTopWidth: 0,
    elevation: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signinPrompt: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 64,
    borderRadius: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 20,
  },
  promptTextWrap: {
    flex: 1,
    gap: 2,
  },
  promptTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  promptDescription: {
    opacity: 0.88,
    fontSize: 12,
    lineHeight: 18,
  },
  promptButton: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#6e61ff",
  },
  promptButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
