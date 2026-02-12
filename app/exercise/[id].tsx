import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CATEGORY_COLORS, DIFFICULTY_COLORS, EXERCISES } from "@/constants/exercises";
import { useColors } from "@/hooks/use-colors";
import { useWorkout } from "@/lib/workout-store";
import { useSubscription } from "@/lib/subscription-store";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, addToPlan, removeFromPlan } = useWorkout();
  const { subscription } = useSubscription();

  const exercise = EXERCISES.find((e) => e.id === id);
  const isInPlan = state.plan.includes(id || "");

  // Timer state
  const [timerDuration, setTimerDuration] = useState(exercise?.defaultDuration || 30);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeLeft(timerDuration);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [timerDuration]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            return 0;
          }
          if (prev <= 4 && Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const toggleTimer = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Check subscription before starting exercise
    if (!subscription.isSubscribed && !isRunning) {
      router.push("/paywall" as any);
      return;
    }
    if (timeLeft === 0) {
      setTimeLeft(timerDuration);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  }, [timeLeft, timerDuration, subscription.isSubscribed, isRunning, router]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(timerDuration);
  }, [timerDuration]);

  if (!exercise) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center">
        <Text style={{ color: colors.foreground }}>Exercise not found</Text>
      </ScreenContainer>
    );
  }

  const durationOptions = [15, 30, 45, 60];
  const progress = timerDuration > 0 ? (timerDuration - timeLeft) / timerDuration : 0;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header with back button */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/exercises" as any);
              }
            }}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              isInPlan ? removeFromPlan(exercise.id) : addToPlan(exercise.id);
            }}
            style={({ pressed }) => [
              styles.planBtn,
              { backgroundColor: isInPlan ? colors.primary : colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name={isInPlan ? "checkmark.circle.fill" : "plus.circle.fill"}
              size={18}
              color={isInPlan ? "#FFFFFF" : colors.primary}
            />
            <Text style={[styles.planBtnText, { color: isInPlan ? "#FFFFFF" : colors.primary }]}>
              {isInPlan ? "In Plan" : "Add to Plan"}
            </Text>
          </Pressable>
        </View>

        {/* Demo Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: exercise.demoImage }}
            style={styles.demoImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.imageOverlay}>
            <View style={[styles.calBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
              <IconSymbol name="flame.fill" size={14} color="#FF6B35" />
              <Text style={styles.calText}>~{exercise.caloriesPerMinute} cal/min</Text>
            </View>
          </View>
        </View>

        {/* Exercise Info */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.exerciseName, { color: colors.foreground }]}>{exercise.name}</Text>
            <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[exercise.difficulty].bg }]}>
              <Text style={styles.diffText}>{exercise.difficulty}</Text>
            </View>
          </View>
          <View style={[styles.categoryTag, { backgroundColor: CATEGORY_COLORS[exercise.category].bg + "20" }]}>
            <Text style={[styles.categoryTagText, { color: CATEGORY_COLORS[exercise.category].bg }]}>
              {exercise.category === "fat-burning"
                ? "Fat Burning"
                : exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}
            </Text>
          </View>
          <Text style={[styles.description, { color: colors.muted }]}>{exercise.description}</Text>

          {/* Muscle Groups */}
          <View style={styles.muscleRow}>
            {exercise.muscleGroups.map((mg) => (
              <View key={mg} style={[styles.muscleBadge, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.muscleText, { color: colors.primary }]}>{mg}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Instructions</Text>
          {exercise.instructions.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumText}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Timer */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Timer</Text>

          {/* Duration selector */}
          <View style={styles.durationRow}>
            {durationOptions.map((d) => (
              <Pressable
                key={d}
                onPress={() => setTimerDuration(d)}
                style={({ pressed }) => [
                  styles.durationOption,
                  {
                    backgroundColor: timerDuration === d ? colors.primary : colors.surface,
                    borderColor: timerDuration === d ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.durationText,
                    { color: timerDuration === d ? "#FFFFFF" : colors.foreground },
                  ]}
                >
                  {d}s
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Timer Display */}
          <View style={[styles.timerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.timerProgressContainer}>
              <View style={[styles.timerProgressBg, { backgroundColor: colors.border }]} />
              <View
                style={[
                  styles.timerProgressFill,
                  { backgroundColor: colors.primary, width: `${progress * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.timerDisplay, { color: colors.foreground }]}>
              {timeLeft}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.muted }]}>seconds</Text>
            <View style={styles.timerControls}>
              <Pressable
                onPress={resetTimer}
                style={({ pressed }) => [
                  styles.timerBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="stop.fill" size={20} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={toggleTimer}
                style={({ pressed }) => [
                  styles.timerPlayBtn,
                  { backgroundColor: colors.primary },
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <IconSymbol
                  name={isRunning ? "pause.fill" : "play.fill"}
                  size={28}
                  color="#FFFFFF"
                />
              </Pressable>
              <View style={styles.timerBtn} />
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  planBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  planBtnText: { fontSize: 14, fontWeight: "600" },
  imageContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  demoImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 16,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  calBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  calText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  infoSection: { paddingHorizontal: 20, marginBottom: 24 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  exerciseName: { fontSize: 26, fontWeight: "700", flex: 1 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  diffText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF", textTransform: "capitalize" },
  categoryTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryTagText: { fontSize: 13, fontWeight: "600" },
  description: { fontSize: 15, lineHeight: 22 },
  muscleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  muscleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  muscleText: { fontSize: 13, fontWeight: "600" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  stepNumText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  stepText: { fontSize: 15, lineHeight: 22, flex: 1 },
  durationRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  durationOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  durationText: { fontSize: 15, fontWeight: "600" },
  timerCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
  },
  timerProgressContainer: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    marginBottom: 24,
    overflow: "hidden",
  },
  timerProgressBg: {
    position: "absolute",
    width: "100%",
    height: 6,
    borderRadius: 3,
  },
  timerProgressFill: { height: 6, borderRadius: 3 },
  timerDisplay: { fontSize: 72, fontWeight: "800", lineHeight: 80 },
  timerLabel: { fontSize: 16, marginTop: 4 },
  timerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 24,
  },
  timerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  timerPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
