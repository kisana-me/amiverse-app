import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useOverlay } from "@/providers/OverlayProvider";

export function InitOverlay() {
  const { initOverlay } = useOverlay();

  if (!initOverlay.is_loading) return null;

  return (
    <ThemedView style={styles.overlay} pointerEvents="auto">
      <View style={styles.content}>
        <Image
          source={require("../assets/images/icon-tp.png")}
          style={styles.icon}
          contentFit="contain"
        />

        <ThemedText style={styles.message} type="defaultSemiBold">
          {initOverlay.loading_message}
        </ThemedText>

        <ThemedText style={styles.progress}>
          {initOverlay.loading_progress}%
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    elevation: 1000,
  },
  content: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  icon: {
    width: 96,
    height: 96,
  },
  message: {
    textAlign: "center",
  },
  progress: {
    textAlign: "center",
  },
});
