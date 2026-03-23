import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useColors } from "@/providers/UIProvider";
import { ToastType } from "@/types/toast";

type ToastContextType = {
  toasts: ToastType[];
  addToast: (
    toast: Pick<ToastType, "message" | "detail"> & { durationMs?: number },
  ) => void;
  dismissToast: (date: number) => void;
  setToastPaused: (date: number, paused: boolean) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

const TOAST_DURATION_MS = 6000;
const TICK_MS = 100;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setToasts((prev) => {
        let removedAny = false;
        const next: ToastType[] = [];
        for (const toast of prev) {
          if (toast.status !== "show") continue;
          if (toast.paused) {
            next.push(toast);
            continue;
          }

          const remainingMs = toast.remainingMs - delta;
          if (remainingMs <= 0) {
            removedAny = true;
            continue;
          }

          next.push({ ...toast, remainingMs });
        }

        if (removedAny) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }

        return next;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, []);

  const dismissToast = useCallback((date: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setToasts((prev) => prev.filter((t) => t.date !== date));
  }, []);

  const setToastPaused = useCallback((date: number, paused: boolean) => {
    setToasts((prev) =>
      prev.map((t) => (t.date === date ? { ...t, paused } : t)),
    );
  }, []);

  const addToast = useCallback(
    (toast: { message: string; detail?: string; durationMs?: number }) => {
      const date = Date.now();
      const durationMs = toast.durationMs ?? TOAST_DURATION_MS;
      const newToast: ToastType = {
        message: toast.message,
        detail: toast.detail,
        status: "show" as const,
        date,
        durationMs,
        remainingMs: durationMs,
        paused: false,
      };

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setToasts((prev) => [...prev, newToast]);
    },
    [],
  );

  const value: ToastContextType = {
    toasts,
    addToast,
    dismissToast,
    setToastPaused,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

function hexToRgba(hex: string, alpha: number) {
  if (!hex.startsWith("#") || (hex.length !== 7 && hex.length !== 9))
    return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ToastViewport() {
  const { toasts, dismissToast, setToastPaused } = useToast();
  const insets = useSafeAreaInsets();
  const backgroundColor = useColors().background_color;
  const borderColor = useColors().border_color;
  const tintColor = useColors().link_color;
  const textColor = useColors().font_color;

  const visibleToasts = useMemo(
    () => toasts.filter((t) => t.status === "show"),
    [toasts],
  );

  if (visibleToasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="box-none"
        style={[
          styles.viewport,
          {
            paddingBottom: insets.bottom + 64,
          },
        ]}
      >
        <View pointerEvents="box-none" style={styles.stack}>
          {visibleToasts.map((toast) => {
            const percent = Math.max(
              0,
              Math.min(1, toast.remainingMs / Math.max(1, toast.durationMs)),
            );

            return (
              <Pressable
                key={toast.date}
                onPressIn={() => setToastPaused(toast.date, true)}
                onPressOut={() => setToastPaused(toast.date, false)}
                // Web hover
                onHoverIn={() => setToastPaused(toast.date, true)}
                onHoverOut={() => setToastPaused(toast.date, false)}
                style={[
                  styles.toast,
                  {
                    backgroundColor,
                    borderColor: hexToRgba(borderColor, 0.35),
                  },
                ]}
              >
                <View style={styles.row}>
                  <View style={styles.texts}>
                    <ThemedText
                      type="defaultSemiBold"
                      numberOfLines={2}
                      style={styles.message}
                    >
                      {toast.message}
                    </ThemedText>
                    {toast.detail ? (
                      <ThemedText numberOfLines={4} style={styles.detail}>
                        {toast.detail}
                      </ThemedText>
                    ) : null}
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="閉じる"
                    onPress={() => dismissToast(toast.date)}
                    hitSlop={10}
                    style={styles.close}
                  >
                    <ThemedText
                      style={[styles.closeText, { color: textColor }]}
                    >
                      ✕
                    </ThemedText>
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: hexToRgba(borderColor, 0.18) },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: tintColor,
                        width: `${percent * 100}%`,
                      },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    zIndex: 1000,
    elevation: 1000,
  },
  // Newest toast at the bottom, stack upwards
  stack: {
    flexDirection: "column-reverse",
    gap: 8,
  },
  toast: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  message: {
    marginBottom: 2,
  },
  detail: {
    opacity: 0.9,
  },
  close: {
    paddingTop: 2,
    paddingLeft: 6,
  },
  closeText: {
    fontSize: 16,
    lineHeight: 18,
  },
  progressTrack: {
    marginTop: 10,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
  },
});
