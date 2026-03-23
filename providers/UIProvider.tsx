import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

type UserTheme = "light" | "dark" | "system";
type EffectiveTheme = "light" | "dark";
type FontSize = "small" | "medium" | "large";

type ThemeColors = {
  background_color: string;
  font_color: string;
  link_color: string;
  border_color: string;
  transparent_background_color: string;
  content_color: string;
  shadow_color: string;
  blur_color: string;
  primary_color: string;
  button_color: string;
  button_font_color: string;
  hover_color: string;
  inconspicuous_font_color: string;
  inconspicuous_background_color: string;
  accent_color: string;
  active_background_color: string;
  inactive_background_color: string;
};

const STORAGE_KEYS = {
  userTheme: "userTheme",
  themeHue: "themeHue",
  fontSize: "fontSize",
} as const;

const LIGHT_COLORS: ThemeColors = {
  background_color: "#ffffff",
  font_color: "#000000",
  link_color: "#46be1b",
  border_color: "#acacac",
  transparent_background_color: "#0000003f",
  content_color: "#ffffff",
  shadow_color: "#808080",
  blur_color: "#ffffff88",
  primary_color: "#0000ff",
  button_color: "#000000",
  button_font_color: "#ffffff",
  hover_color: "#b5b5b588",
  inconspicuous_font_color: "#6b6b6b",
  inconspicuous_background_color: "#d8d8d8",
  accent_color: "#f4212e",
  active_background_color: "#ffffff",
  inactive_background_color: "#eaeaea",
};

const DARK_COLORS: ThemeColors = {
  background_color: "#000000",
  font_color: "#ffffff",
  link_color: "#6ef744",
  border_color: "#7c7c7c",
  transparent_background_color: "#00000060",
  content_color: "#141414",
  shadow_color: "#808080",
  blur_color: "#00000088",
  primary_color: "#0000df",
  button_color: "#ffffff",
  button_font_color: "#000000",
  hover_color: "#ffffff88",
  inconspicuous_font_color: "#bcbcbc",
  inconspicuous_background_color: "#444444",
  accent_color: "#f4212e",
  active_background_color: "#373737",
  inactive_background_color: "#000000",
};

type UIContextType = {
  userTheme: UserTheme;
  setUserTheme: (value: UserTheme) => void;
  toggleTheme: () => void;

  effectiveTheme: EffectiveTheme;
  Colors: ThemeColors;

  hue: number;
  setHue: (value: number) => void;

  fontSize: FontSize;
  setFontSize: (value: FontSize) => void;
};

const UIContext = createContext<UIContextType | null>(null);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [userTheme, setUserTheme] = useState<UserTheme>("system");
  const [hue, setHue] = useState<number>(200);
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [isHydrated, setIsHydrated] = useState(false);

  const systemColorScheme = useColorScheme();
  const normalizedSystemTheme: EffectiveTheme =
    systemColorScheme === "dark" ? "dark" : "light";

  useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      try {
        const [storedTheme, storedHue, storedFontSize] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.userTheme),
          AsyncStorage.getItem(STORAGE_KEYS.themeHue),
          AsyncStorage.getItem(STORAGE_KEYS.fontSize),
        ]);

        if (!isActive) return;

        if (storedTheme && ["light", "dark", "system"].includes(storedTheme)) {
          setUserTheme(storedTheme as UserTheme);
        } else if (storedTheme) {
          console.error(
            "[UIProvider] Invalid userTheme in storage:",
            storedTheme,
            "- clearing",
          );
          await AsyncStorage.removeItem(STORAGE_KEYS.userTheme);
        }

        if (storedHue) {
          const hueNum = Number(storedHue);
          if (!Number.isNaN(hueNum) && hueNum >= 0 && hueNum < 360) {
            setHue(hueNum);
          } else {
            console.error(
              "[UIProvider] Invalid themeHue in storage:",
              storedHue,
              "- clearing",
            );
            await AsyncStorage.removeItem(STORAGE_KEYS.themeHue);
          }
        }

        if (
          storedFontSize &&
          ["small", "medium", "large"].includes(storedFontSize)
        ) {
          setFontSize(storedFontSize as FontSize);
        } else if (storedFontSize) {
          console.error(
            "[UIProvider] Invalid fontSize in storage:",
            storedFontSize,
            "- clearing",
          );
          await AsyncStorage.removeItem(STORAGE_KEYS.fontSize);
        }
      } catch (error) {
        console.error("[UIProvider] Error reading from storage:", error);
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      isActive = false;
    };
  }, []);

  const effectiveTheme: EffectiveTheme =
    userTheme === "system" ? normalizedSystemTheme : userTheme;

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.userTheme, userTheme).catch((error) => {
      console.error("[UIProvider] Error saving userTheme to storage:", error);
    });
  }, [isHydrated, userTheme]);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.themeHue, String(hue)).catch((error) => {
      console.error("[UIProvider] Error saving themeHue to storage:", error);
    });
  }, [hue, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.fontSize, fontSize).catch((error) => {
      console.error("[UIProvider] Error saving fontSize to storage:", error);
    });
  }, [fontSize, isHydrated]);

  const toggleTheme = () => {
    setUserTheme((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      if (prev === "system") return "light";
      return "dark";
    });
  };

  const Colors = useMemo<ThemeColors>(() => {
    return effectiveTheme === "dark" ? DARK_COLORS : LIGHT_COLORS;
  }, [effectiveTheme]);

  const value: UIContextType = {
    userTheme,
    setUserTheme,
    toggleTheme,

    effectiveTheme,
    Colors,

    hue,
    setHue,

    fontSize,
    setFontSize,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside UIProvider");
  return context;
};

export const useColors = () => {
  return useUI().Colors;
};

export type { EffectiveTheme, FontSize, ThemeColors, UserTheme };
