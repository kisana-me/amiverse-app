import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

const CUSTOM_MAPPING = {
  index: "house.fill",
  "index.fill": "house.fill",
  discovery: "magnifyingglass",
  "discovery.fill": "magnifyingglass",
  dashboard: "square.grid.2x2.fill",
  "dashboard.fill": "square.grid.2x2.fill",
  notifications: "bell.fill",
  "notifications.fill": "bell.fill",
  communities: "person.2.fill",
  "communities.fill": "person.2.fill",
} satisfies Record<string, SymbolViewProps["name"]>;

type IconSymbolName = keyof typeof CUSTOM_MAPPING | SymbolViewProps["name"];

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const resolvedName =
    name in CUSTOM_MAPPING
      ? CUSTOM_MAPPING[name as keyof typeof CUSTOM_MAPPING]
      : (name as SymbolViewProps["name"]);

  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={resolvedName}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
