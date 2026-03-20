import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { router, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { InitOverlay } from "@/components/init-overlay";
import { SideMenus } from "@/components/side-menus";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { emitHomeRefresh } from "@/lib/home-refresh";
import { AccountsProvider } from "@/providers/AccountsProvider";
import { CurrentAccountProvider } from "@/providers/CurrentAccountProvider";
import { FeedsProvider } from "@/providers/FeedsProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { OverlayProvider } from "@/providers/OverlayProvider";
import { PostsProvider } from "@/providers/PostsProvider";
import { ToastProvider, ToastViewport } from "@/providers/ToastProvider";
import { TrendsProvider } from "@/providers/TrendsProvider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

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

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <OverlayProvider>
          <ToastProvider>
            <CurrentAccountProvider>
              <AccountsProvider>
                <NotificationsProvider>
                  <TrendsProvider>
                    <PostsProvider>
                      <FeedsProvider>
                        <Stack>
                          <Stack.Screen
                            name="(tabs)"
                            options={{ headerShown: false }}
                          />
                          <Stack.Screen
                            name="modal"
                            options={{ presentation: "modal", title: "Modal" }}
                          />
                        </Stack>
                        <SideMenus />
                        <InitOverlay />
                        <ToastViewport />
                        <StatusBar style="auto" />
                      </FeedsProvider>
                    </PostsProvider>
                  </TrendsProvider>
                </NotificationsProvider>
              </AccountsProvider>
            </CurrentAccountProvider>
          </ToastProvider>
        </OverlayProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
