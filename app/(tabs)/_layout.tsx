import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";

import { IconSymbol } from "@/components/icons";
import { useColors } from "@/providers/UIProvider";

export default function TabLayout() {
  const colors = useColors();
  const iconSize = 32;
  const tabBackgroundColor = colors.background_color;

  return (
    <Tabs
      backBehavior="history"
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        tabBarActiveTintColor: colors.font_color,
        tabBarInactiveTintColor: colors.font_color,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: tabBackgroundColor,
          borderTopWidth: 0,
          elevation: 0,
          paddingTop: 3,
          overflow: "hidden",
        },
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={{ flex: 1, backgroundColor: tabBackgroundColor }}
          />
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
