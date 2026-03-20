import { Platform } from "react-native";

const tintColor = "#3ee820";

export const Colors = {
  light: {
    text: "#000000",
    background: "#ffffff",
    tint: tintColor,
    icon: "#687076",
    tabIconDefault: "#000000",
    tabIconSelected: "#ffffff",
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    tint: tintColor,
    icon: "#9BA1A6",
    tabIconDefault: "#ffffff",
    tabIconSelected: "#000000",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
