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
  "crown.fill": "workspace-premium",
  "medal.fill": "military-tech",
  "star.circle.fill": "stars",
  "flame.circle.fill": "whatshot",
  "circle.grid.2x2.fill": "grid-view",
  "sunrise.fill": "wb-sunny",
  "bell.fill": "notifications",
  "lock.fill": "lock",
  "sparkles": "auto-awesome",
  "arrow.clockwise": "refresh",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "figure.strengthtraining.traditional": "fitness-center",
  // Password visibility toggle
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  // Achievement badge icons
  "moon.stars.fill": "nightlight",
  "bolt.circle.fill": "offline-bolt",
  "target": "my-location",
  "heart.circle.fill": "favorite",
  "flame": "local-fire-department",
  "fire": "local-fire-department",
  "tree.fill": "park",
  "arrow.circlepath": "autorenew",
  "exclamationmark.circle.fill": "error",
  "info.circle.fill": "info",
  "checkmark.seal.fill": "verified",
  "shield.fill": "shield",
  "calendar": "calendar-today",
  "moon.fill": "nightlight-round",
  "sun.max.fill": "wb-sunny",
} as unknown as IconMapping;

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
