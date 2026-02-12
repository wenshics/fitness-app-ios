import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EXERCISES } from "@/constants/exercises";
import { useColors } from "@/hooks/use-colors";
import { useWorkout } from "@/lib/workout-store";
import { useSubscription } from "@/lib/subscription-store";
import { useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

type SessionPhase = "exercise" | "rest" | "complete" | "countdown";

export default function WorkoutSessionScreen() {
  if (Platform.OS !== "web") {
    useKeepAwake();
  }

  const colors = useColors();
  const router = useRouter();
  const { state, completeWorkout } = useWorkout();
  const { subscription } = useSubscription();

  // Redirect to paywall if not subscribed
  useEffect(() => {
    if (subscription.loaded && !subscription.isSubscribed) {
      router.replace("/paywall" as any);
    }
  }, [subscription.loaded, subscription.isSubscribed, router]);

  const planExercises = state.dailyPlan
    .map((id: string) => EXERCISES.find((e) => e.id === id))
    .filter(Boolean) as typeof EXERCISES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>("countdown");
  const [timeLeft, setTimeLeft] = useState(3); // 3 second countdown
  const [isPaused, setIsPaused] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentExercise = planExercises[currentIndex];
  const nextExercise = planExercises[currentIndex + 1];
  const restTime = state.settings.restTime;

  // Timer logic
  useEffect(() => {
    if (isPaused || phase === "complete") return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer finished
          if (phase === "countdown") {
            // Start exercise
            setPhase("exercise");
            return currentExercise?.defaultDuration || 30;
          } else if (phase === "exercise") {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            // Mark exercise as completed
            if (currentExercise) {
              setCompletedIds((prev) => [...prev, currentExercise.id]);
            }
            // Move to rest or complete
            if (currentIndex < planExercises.length - 1) {
              setPhase("rest");
              return restTime;
            } else {
              setPhase("complete");
              return 0;
            }
          } else if (phase === "rest") {
            // Start next exercise
            setCurrentIndex((prev) => prev + 1);
            setPhase("exercise");
            const nextEx = planExercises[currentIndex + 1];
            return nextEx?.defaultDuration || 30;
          }
          return 0;
        }
        // Countdown beeps
        if (prev <= 4 && Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, isPaused, currentIndex, currentExercise, restTime, planExercises]);

  const handlePause = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused((prev) => !prev);
  }, []);

  const handleSkip = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentExercise) {
      setCompletedIds((prev) => [...prev, currentExercise.id]);
    }
    if (currentIndex < planExercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPhase("exercise");
      const nextEx = planExercises[currentIndex + 1];
      setTimeLeft(nextEx?.defaultDuration || 30);
    } else {
      setPhase("complete");
    }
  }, [currentIndex, planExercises, currentExercise]);

  const handleStop = useCallback(() => {
    Alert.alert("End Workout", "Are you sure you want to end this workout?", [
      { text: "Continue", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: () => {
          const totalDuration = Math.round((Date.now() - startTime) / 1000);
          if (completedIds.length > 0) {
            completeWorkout(completedIds, totalDuration);
          }
          router.back();
        },
      },
    ]);
  }, [completedIds, startTime, completeWorkout, router]);

  const handleFinish = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const totalDuration = Math.round((Date.now() - startTime) / 1000);
    completeWorkout(completedIds, totalDuration);
    router.back();
  }, [completedIds, startTime, completeWorkout, router]);

  if (planExercises.length === 0) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center p-8">
        <IconSymbol name="dumbbell.fill" size={48} color={colors.muted} />
        <Text style={[styles.emptyText, { color: colors.foreground }]}>No exercises in your plan</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  // Complete screen
  if (phase === "complete") {
    const totalDuration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(totalDuration / 60);
    const seconds = totalDuration % 60;

    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.completeContainer}>
          <View style={[styles.completeIcon, { backgroundColor: colors.success + "20" }]}>
            <IconSymbol name="checkmark.circle.fill" size={64} color={colors.success} />
          </View>
          <Text style={[styles.completeTitle, { color: colors.foreground }]}>Workout Complete!</Text>
          <Text style={[styles.completeSubtitle, { color: colors.muted }]}>Great job! Keep it up!</Text>

          <View style={styles.completeStats}>
            <View style={[styles.completeStat, { backgroundColor: colors.surface }]}>
              <Text style={[styles.completeStatValue, { color: colors.primary }]}>
                {completedIds.length}
              </Text>
              <Text style={[styles.completeStatLabel, { color: colors.muted }]}>Exercises</Text>
            </View>
            <View style={[styles.completeStat, { backgroundColor: colors.surface }]}>
              <Text style={[styles.completeStatValue, { color: colors.primary }]}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </Text>
              <Text style={[styles.completeStatLabel, { color: colors.muted }]}>Duration</Text>
            </View>
          </View>

          <Pressable
            onPress={handleFinish}
            style={({ pressed }) => [
              styles.finishBtn,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.finishBtnText}>Done</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // Countdown / Exercise / Rest screen
  const totalTime =
    phase === "countdown"
      ? 3
      : phase === "exercise"
        ? currentExercise?.defaultDuration || 30
        : restTime;
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.sessionContainer}>
        {/* Top bar */}
        <View style={styles.sessionTopBar}>
          <Pressable
            onPress={handleStop}
            style={({ pressed }) => [
              styles.stopBtn,
              { backgroundColor: colors.error + "15" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
            <Text style={[styles.stopBtnText, { color: colors.error }]}>End</Text>
          </Pressable>
          <Text style={[styles.progressText, { color: colors.muted }]}>
            {currentIndex + 1} / {planExercises.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={[styles.sessionProgress, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.sessionProgressFill,
              {
                backgroundColor: colors.primary,
                width: `${((currentIndex + progress) / planExercises.length) * 100}%`,
              },
            ]}
          />
        </View>

        {/* Main content */}
        <View style={styles.sessionMain}>
          {phase === "countdown" ? (
            <>
              <Text style={[styles.phaseLabel, { color: colors.muted }]}>GET READY</Text>
              <Text style={[styles.exerciseTitle, { color: colors.foreground }]}>
                {currentExercise?.name}
              </Text>
            </>
          ) : phase === "rest" ? (
            <>
              <Text style={[styles.phaseLabel, { color: colors.success }]}>REST</Text>
              {nextExercise && (
                <Text style={[styles.nextLabel, { color: colors.muted }]}>
                  Next: {nextExercise.name}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.phaseLabel, { color: colors.primary }]}>GO!</Text>
              <Text style={[styles.exerciseTitle, { color: colors.foreground }]}>
                {currentExercise?.name}
              </Text>
              <Text style={[styles.muscleLabel, { color: colors.muted }]}>
                {currentExercise?.muscleGroups.join(" · ")}
              </Text>
            </>
          )}

          {/* Timer */}
          <View style={styles.timerCircle}>
            <Text
              style={[
                styles.timerBig,
                {
                  color:
                    phase === "rest"
                      ? colors.success
                      : phase === "countdown"
                        ? colors.warning
                        : colors.primary,
                },
              ]}
            >
              {timeLeft}
            </Text>
          </View>

          {/* Timer progress bar */}
          <View style={[styles.timerBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.timerBarFill,
                {
                  backgroundColor:
                    phase === "rest"
                      ? colors.success
                      : phase === "countdown"
                        ? colors.warning
                        : colors.primary,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>

          {isPaused && (
            <Text style={[styles.pausedLabel, { color: colors.warning }]}>PAUSED</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="forward.fill" size={24} color={colors.foreground} />
            <Text style={[styles.controlLabel, { color: colors.muted }]}>Skip</Text>
          </Pressable>

          <Pressable
            onPress={handlePause}
            style={({ pressed }) => [
              styles.pauseBtn,
              { backgroundColor: isPaused ? colors.success : colors.primary },
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <IconSymbol
              name={isPaused ? "play.fill" : "pause.fill"}
              size={32}
              color="#FFFFFF"
            />
          </Pressable>

          <Pressable
            onPress={handleStop}
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="stop.fill" size={24} color={colors.error} />
            <Text style={[styles.controlLabel, { color: colors.muted }]}>Stop</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyText: { fontSize: 18, fontWeight: "600", marginTop: 16 },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  backButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  sessionContainer: { flex: 1, paddingHorizontal: 20 },
  sessionTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stopBtnText: { fontSize: 14, fontWeight: "600" },
  progressText: { fontSize: 16, fontWeight: "600" },
  sessionProgress: { height: 4, borderRadius: 2, marginBottom: 32 },
  sessionProgressFill: { height: 4, borderRadius: 2 },
  sessionMain: { flex: 1, justifyContent: "center", alignItems: "center" },
  phaseLabel: { fontSize: 16, fontWeight: "700", letterSpacing: 2, marginBottom: 8 },
  exerciseTitle: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  muscleLabel: { fontSize: 14, marginBottom: 8 },
  nextLabel: { fontSize: 16, marginBottom: 16 },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 24,
  },
  timerBig: { fontSize: 80, fontWeight: "800", lineHeight: 88 },
  timerBar: { width: "80%", height: 6, borderRadius: 3, overflow: "hidden" },
  timerBarFill: { height: 6, borderRadius: 3 },
  pausedLabel: { fontSize: 18, fontWeight: "700", marginTop: 16 },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
    paddingBottom: 40,
  },
  controlBtn: {
    alignItems: "center",
    gap: 4,
    padding: 12,
    borderRadius: 16,
  },
  controlLabel: { fontSize: 12 },
  pauseBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  completeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  completeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  completeTitle: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  completeSubtitle: { fontSize: 16, marginBottom: 32 },
  completeStats: { flexDirection: "row", gap: 16, marginBottom: 40 },
  completeStat: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
  },
  completeStatValue: { fontSize: 28, fontWeight: "700" },
  completeStatLabel: { fontSize: 14, marginTop: 4 },
  finishBtn: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },
  finishBtnText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
});
