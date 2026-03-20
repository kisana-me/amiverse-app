import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useOverlay } from "@/providers/OverlayProvider";
import type { ReactNode } from "react";

export default function MainHeader({ children }: { children?: ReactNode }) {
  const { headerMenuTrigger, asideMenuTrigger } = useOverlay();
  const backgroundColor = useThemeColor({}, "background");

  return (
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor }]}>
      <ThemedView style={styles.root}>
        <View style={styles.side}>
          <Pressable
            onPress={headerMenuTrigger}
            accessibilityRole="button"
            accessibilityLabel="メニュー"
            style={styles.button}
            hitSlop={8}
          >
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </Pressable>
        </View>

        <View style={styles.content}>{children}</View>

        <View style={styles.side}>
          <Pressable
            onPress={asideMenuTrigger}
            accessibilityRole="button"
            accessibilityLabel="サイドメニュー"
            style={styles.button}
            hitSlop={8}
          >
            <ThemedText style={styles.menuIcon}>☰</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    width: "100%",
    zIndex: 80,
  },
  root: {
    height: 50,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 20,
    lineHeight: 20,
  },
});
