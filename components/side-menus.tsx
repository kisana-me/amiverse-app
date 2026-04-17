import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useCurrentAccount } from "@/providers/CurrentAccountProvider";
import { useOverlay } from "@/providers/OverlayProvider";
import { useToast } from "@/providers/ToastProvider";
import { useTrends } from "@/providers/TrendsProvider";
import { useColors } from "@/providers/UIProvider";

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  const borderColor = useColors().border_color;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuItem, { borderBottomColor: borderColor }]}
      accessibilityRole="button"
    >
      <ThemedText style={styles.menuItemText}>{label}</ThemedText>
    </Pressable>
  );
}

export function SideMenus() {
  const pathname = usePathname();
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(340, Math.round(windowWidth * 0.86));

  const backdropColor = "rgba(0,0,0,0.4)";
  const borderColor = useColors().border_color;
  const backgroundColor = useColors().background_color;

  const { currentAccount, currentAccountStatus } = useCurrentAccount();
  const { trends, trendsLoading } = useTrends();
  const { addToast } = useToast();
  const {
    isHeaderMenuOpen,
    isAsideMenuOpen,
    setIsHeaderMenuOpen,
    setIsAsideMenuOpen,
    closeMenu,
  } = useOverlay();

  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;

  const [leftVisible, setLeftVisible] = useState(false);
  const [rightVisible, setRightVisible] = useState(false);

  const closeLeftMenu = useCallback(() => {
    setIsHeaderMenuOpen(false);
  }, [setIsHeaderMenuOpen]);

  const closeRightMenu = useCallback(() => {
    setIsAsideMenuOpen(false);
  }, [setIsAsideMenuOpen]);

  const animateTo = useCallback(
    (anim: Animated.Value, toValue: number, onEnd?: () => void) => {
      anim.stopAnimation(() => {
        Animated.timing(anim, {
          toValue,
          duration: 180,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onEnd?.();
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (isHeaderMenuOpen) {
      setLeftVisible(true);
      animateTo(leftAnim, 1);
      return;
    }

    if (leftVisible) {
      animateTo(leftAnim, 0, () => setLeftVisible(false));
    } else {
      leftAnim.setValue(0);
    }
  }, [isHeaderMenuOpen, leftAnim, leftVisible, animateTo]);

  useEffect(() => {
    if (isAsideMenuOpen) {
      setRightVisible(true);
      animateTo(rightAnim, 1);
      return;
    }

    if (rightVisible) {
      animateTo(rightAnim, 0, () => setRightVisible(false));
    } else {
      rightAnim.setValue(0);
    }
  }, [isAsideMenuOpen, rightAnim, rightVisible, animateTo]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  const top5 = useMemo(() => {
    const first = trends?.[0];
    const ranking = first?.ranking ?? [];
    return ranking.slice(0, 5);
  }, [trends]);

  const toQuotedQuery = useCallback((word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return "";
    const unwrapped = trimmed.replace(/^"(.*)"$/, "$1").trim();
    if (!unwrapped) return "";
    return `"${unwrapped}"`;
  }, []);

  const handlePressTrend = useCallback(
    (word: string) => {
      const query = toQuotedQuery(word);
      if (!query) return;
      router.push({
        pathname: "/search",
        params: { query },
      });
    },
    [toQuotedQuery],
  );

  const leftTranslateX = leftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const leftSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx < -8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) &&
          Math.abs(gesture.dx) > 12,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx <= -40 || gesture.vx <= -0.35) {
            closeLeftMenu();
          }
        },
      }),
    [closeLeftMenu],
  );

  const rightSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) &&
          Math.abs(gesture.dx) > 12,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx >= 40 || gesture.vx >= 0.35) {
            closeRightMenu();
          }
        },
      }),
    [closeRightMenu],
  );

  const rightTranslateX = rightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [drawerWidth, 0],
  });

  const openExternal = useCallback(
    async (url: string) => {
      closeRightMenu();
      try {
        await openBrowserAsync(url);
      } catch (error) {
        addToast({
          message: "エラー",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [addToast, closeRightMenu],
  );

  return (
    <>
      <Modal
        visible={leftVisible}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        onRequestClose={closeLeftMenu}
      >
        <View style={styles.modalRoot}>
          <View
            style={[styles.backdrop, { backgroundColor: backdropColor }]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={closeLeftMenu}
          />

          <Animated.View
            {...leftSwipeResponder.panHandlers}
            style={[
              styles.drawer,
              {
                width: drawerWidth,
                backgroundColor,
                borderRightColor: borderColor,
                transform: [{ translateX: leftTranslateX }],
              },
            ]}
          >
            <SafeAreaView
              style={styles.drawerSafeArea}
              edges={["top", "bottom"]}
            >
              <ThemedView style={styles.drawerHeader}>
                {currentAccountStatus === "signed_in" && currentAccount ? (
                  <View style={styles.profileRow}>
                    <Image
                      source={{ uri: currentAccount.icon_url }}
                      style={styles.avatar}
                      contentFit="cover"
                    />
                    <View style={styles.profileText}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {currentAccount.name}
                      </ThemedText>
                      <ThemedText style={styles.subtle} numberOfLines={1}>
                        @{currentAccount.name_id}
                      </ThemedText>
                    </View>
                  </View>
                ) : (
                  <ThemedText type="defaultSemiBold">ゲスト</ThemedText>
                )}
              </ThemedView>

              <ScrollView contentContainerStyle={styles.drawerBody}>
                {currentAccountStatus === "signed_in" && currentAccount ? (
                  <MenuItem
                    label="プロフィール編集"
                    onPress={() => router.push("/settings/account" as any)}
                  />
                ) : (
                  <MenuItem
                    label="サインイン"
                    onPress={() => router.push("/signin")}
                  />
                )}
                <MenuItem
                  label="設定"
                  onPress={() => router.push("/settings")}
                />
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={rightVisible}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        onRequestClose={closeRightMenu}
      >
        <View style={styles.modalRoot}>
          <View
            style={[styles.backdrop, { backgroundColor: backdropColor }]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={closeRightMenu}
          />

          <Animated.View
            {...rightSwipeResponder.panHandlers}
            style={[
              styles.drawer,
              styles.drawerRight,
              {
                width: drawerWidth,
                backgroundColor,
                borderLeftColor: borderColor,
                transform: [{ translateX: rightTranslateX }],
              },
            ]}
          >
            <SafeAreaView
              style={styles.drawerSafeArea}
              edges={["top", "bottom"]}
            >
              <ThemedView style={styles.drawerHeader}>
                <ThemedText type="defaultSemiBold">トレンド</ThemedText>
                <ThemedText style={styles.subtle}>
                  {trendsLoading ? "取得中..." : "上位5位"}
                </ThemedText>
              </ThemedView>

              <ScrollView contentContainerStyle={styles.drawerBody}>
                {top5.map((t, index) => (
                  <MenuItem
                    key={`${t.word}:${index}`}
                    label={`${index + 1}位 ${t.word}`}
                    onPress={() => handlePressTrend(t.word)}
                  />
                ))}

                <View style={[styles.sectionDivider, { borderColor }]} />

                <MenuItem
                  label="利用規約"
                  onPress={() =>
                    void openExternal("https://anyur.com/terms-of-service")
                  }
                />
                <MenuItem
                  label="プライバシーポリシー"
                  onPress={() =>
                    void openExternal("https://anyur.com/privacy-policy")
                  }
                />
                <MenuItem
                  label="お問い合わせ"
                  onPress={() => void openExternal("https://anyur.com/contact")}
                />
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  drawerSafeArea: {
    flex: 1,
  },
  drawerRight: {
    left: undefined,
    right: 0,
    borderRightWidth: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  drawerBody: {
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileText: {
    flex: 1,
  },
  subtle: {
    opacity: 0.7,
    fontSize: 12,
    marginTop: 2,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: {
    fontSize: 14,
  },
  sectionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
});
