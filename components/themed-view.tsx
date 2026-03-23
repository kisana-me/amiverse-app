import { View, type ViewProps } from "react-native";

import { useColors, useUI } from "@/providers/UIProvider";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const colors = useColors();
  const { effectiveTheme } = useUI();
  const backgroundColor =
    effectiveTheme === "dark"
      ? (darkColor ?? colors.background_color)
      : (lightColor ?? colors.background_color);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
