import { Stack } from "expo-router";
import React from "react";

export default function PostStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[aid]" />
      <Stack.Screen name="[aid]/quotes" />
      <Stack.Screen name="[aid]/diffuses" />
      <Stack.Screen name="[aid]/reactions" />
    </Stack>
  );
}
