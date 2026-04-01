import { router, usePathname } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/icons";
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

  return (
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
  );
}

const styles = StyleSheet.create({
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
});
