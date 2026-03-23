import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeKey = colorScheme === "dark" ? "dark" : "light";
  const iconSize = 32;

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        tabBarActiveTintColor: Colors[themeKey].text,
        tabBarInactiveTintColor: Colors[themeKey].text,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "#000000",
          borderTopWidth: 0,
          elevation: 0,
          height: 82,
          paddingTop: 8,
          paddingBottom: 12,
          overflow: "hidden",
          zIndex: 10,
        },
        tabBarBackground: () => (
          <View pointerEvents="none" style={styles.tabBackgroundSolid} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Index",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={iconSize}
              name={focused ? "index.fill" : "index"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: "Discovery",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={iconSize}
              name={focused ? "discovery.fill" : "discovery"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={iconSize}
              name={focused ? "dashboard.fill" : "dashboard"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={iconSize}
              name={focused ? "notifications.fill" : "notifications"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: "Communities",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={iconSize}
              name={focused ? "communities.fill" : "communities"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="settings/account" options={{ href: null }} />
      <Tabs.Screen name="signin" options={{ href: null }} />
      <Tabs.Screen name="auth" options={{ href: null }} />
      <Tabs.Screen name="terms" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="contact" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="post/[aid]" options={{ href: null }} />
      <Tabs.Screen name="account/[name_id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = {
  tabBackgroundSolid: {
    flex: 1,
    backgroundColor: "#000000",
  },
};
