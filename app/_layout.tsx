import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { router, Stack, useGlobalSearchParams, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { InitOverlay } from "@/components/init-overlay";
import { MainNav } from "@/components/main_nav";
import { SideMenus } from "@/components/side-menus";
import { emitHomeRefresh } from "@/lib/home-refresh";
import {
  addOnboardingCompletedListener,
  getIsOnboardingCompleted,
} from "@/lib/onboarding";
import { AccountsProvider } from "@/providers/AccountsProvider";
import { CurrentAccountProvider } from "@/providers/CurrentAccountProvider";
import { FeedsProvider } from "@/providers/FeedsProvider";
import { ModalProvider, ModalViewport } from "@/providers/ModalProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { OverlayProvider } from "@/providers/OverlayProvider";
import { PostsProvider } from "@/providers/PostsProvider";
import { ToastProvider, ToastViewport } from "@/providers/ToastProvider";
import { TrendsProvider } from "@/providers/TrendsProvider";
import { UIProvider, useColors, useUI } from "@/providers/UIProvider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UIProvider>
        <RootLayoutContent />
      </UIProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutContent() {
  const { effectiveTheme } = useUI();
  const colors = useColors();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ from?: string | string[] }>();
  const pathnameRef = useRef(pathname);
  const [isOnboardingReady, setIsOnboardingReady] = useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] =
    useState<boolean>(false);
  const backgroundColor = colors.background_color;
  const isOnboardingRoute =
    pathname === "/onboarding" || pathname === "/onboarding-permission";
  const isOnboardingIntroRoute = pathname === "/onboarding";
  const fromParam = Array.isArray(globalParams.from)
    ? globalParams.from[0]
    : globalParams.from;
  const canReplayOnboardingFromSettings =
    isOnboardingIntroRoute && fromParam === "settings";

  useEffect(() => {
    return addOnboardingCompletedListener((value) => {
      setIsOnboardingCompleted(value);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadOnboardingState = async () => {
      try {
        const value = await getIsOnboardingCompleted();
        if (!isMounted) return;
        setIsOnboardingCompleted(value);
      } catch (error) {
        console.error("[RootLayout] Failed to read onboarding status:", error);
      } finally {
        if (isMounted) {
          setIsOnboardingReady(true);
        }
      }
    };

    void loadOnboardingState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOnboardingReady) return;

    if (!isOnboardingCompleted && !isOnboardingRoute) {
      router.replace("/onboarding" as any);
      return;
    }

    if (
      isOnboardingCompleted &&
      isOnboardingIntroRoute &&
      !canReplayOnboardingFromSettings
    ) {
      router.replace("/" as any);
    }
  }, [
    canReplayOnboardingFromSettings,
    isOnboardingCompleted,
    isOnboardingIntroRoute,
    isOnboardingReady,
    isOnboardingRoute,
  ]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const currentPath = pathnameRef.current;
      if (currentPath === "/") {
        emitHomeRefresh();
        return true;
      }

      const canGoBackFn = (router as unknown as { canGoBack?: () => boolean })
        .canGoBack;
      if (typeof canGoBackFn !== "function") return false;
      if (canGoBackFn()) return false;

      router.replace("/");
      setTimeout(() => emitHomeRefresh(), 0);
      return true;
    });

    return () => sub.remove();
  }, []);

  if (!isOnboardingReady) {
    return null;
  }

  return (
    <ThemeProvider value={effectiveTheme === "dark" ? DarkTheme : DefaultTheme}>
      <OverlayProvider>
        <ModalProvider>
          <ToastProvider>
            <CurrentAccountProvider>
              <AccountsProvider>
                <NotificationsProvider>
                  <TrendsProvider>
                    <PostsProvider>
                      <FeedsProvider>
                        <SafeAreaView
                          style={[styles.safe, { backgroundColor }]}
                          edges={["top", "left", "right", "bottom"]}
                        >
                          <View style={styles.contentWrap}>
                            <Stack screenOptions={{ headerShown: false }} />
                          </View>
                          {!isOnboardingRoute && <MainNav />}
                          {!isOnboardingRoute && <SideMenus />}
                          <InitOverlay />
                          <ModalViewport />
                          <ToastViewport />
                          <StatusBar
                            style={effectiveTheme === "dark" ? "light" : "dark"}
                            animated={true}
                            translucent={false}
                          />
                        </SafeAreaView>
                      </FeedsProvider>
                    </PostsProvider>
                  </TrendsProvider>
                </NotificationsProvider>
              </AccountsProvider>
            </CurrentAccountProvider>
          </ToastProvider>
        </ModalProvider>
      </OverlayProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
  },
});
