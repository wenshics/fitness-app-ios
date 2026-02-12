// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "flame.fill": "local-fire-department",
  "dumbbell.fill": "fitness-center",
  "list.bullet": "format-list-bulleted",
  "person.fill": "person",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "stop.fill": "stop",
  "forward.fill": "skip-next",
  "checkmark.circle.fill": "check-circle",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "xmark.circle.fill": "cancel",
  "timer": "timer",
  "bolt.fill": "bolt",
  "heart.fill": "favorite",
  "star.fill": "star",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "gearshape.fill": "settings",
  "rectangle.portrait.and.arrow.right": "logout",
  "clock.fill": "access-time",
  "chart.bar.fill": "bar-chart",
  "trophy.fill": "emoji-events",
  "figure.run": "directions-run",
  "delete.left.fill": "backspace",
  "arrow.up.arrow.down": "swap-vert",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
