import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { DIFFICULTY_COLORS, EXERCISES, type Difficulty } from "@/constants/exercises";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

const TABS: { label: string; value: Difficulty | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export default function ExercisesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Difficulty | "all">("all");

  const filtered =
    activeTab === "all" ? EXERCISES : EXERCISES.filter((e) => e.difficulty === activeTab);

  return (
    <ScreenContainer className="pt-2">
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.foreground }]}>Exercises</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {EXERCISES.length} exercises across all levels
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.value);
              }}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={[styles.tabText, { color: isActive ? "#FFFFFF" : colors.muted }]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/exercise/${item.id}` as any)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: DIFFICULTY_COLORS[item.difficulty].bg },
                  ]}
                >
                  <Text style={styles.difficultyText}>
                    {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardDescription, { color: colors.muted }]} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <IconSymbol name="timer" size={14} color={colors.muted} />
                  <Text style={[styles.metaText, { color: colors.muted }]}>
                    {item.defaultDuration}s
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <IconSymbol name="figure.run" size={14} color={colors.muted} />
                  <Text style={[styles.metaText, { color: colors.muted }]}>
                    {item.muscleGroups.join(", ")}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 4 },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumbnail: {
    width: 100,
    height: 100,
    backgroundColor: "#E0E0E0",
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", flex: 1 },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  difficultyText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  cardDescription: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardMeta: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
});
