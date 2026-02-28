import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CATEGORY_COLORS } from "@/constants/exercises";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useWorkout } from "@/lib/workout-store";
import { useSubscription } from "@/lib/subscription-store";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { state, getDailyPlanExercises, getTotalPlanDuration, refreshDailyPlan } = useWorkout();
  const { subscription } = useSubscription();
  const router = useRouter();
  const planExercises = getDailyPlanExercises();
  const totalDuration = getTotalPlanDuration();
  const completedCount = state.todayCompleted.length;
  const planCount = state.dailyPlan.length;
  const progress = planCount > 0 ? completedCount / planCount : 0;

  const firstName = user?.name?.split(" ")[0] || "";
  const greeting = getGreeting();

  const handleStartWorkout = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!subscription.isSubscribed) {
      router.push("/paywall" as any);
      return;
    }
    router.push("/workout-session" as any);
  };

  return (
    <ScreenContainer className="px-5 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>{greeting}</Text>
            <Text style={[styles.name, { color: colors.foreground }]}>{firstName}</Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="flame.fill" size={20} color={colors.primary} />
            <Text style={[styles.streakText, { color: colors.primary }]}>{state.streak}</Text>
          </View>
        </View>

        {/* Today's Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: colors.primary }]}>
          <View style={styles.progressCardContent}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressTitle}>Today's Workout</Text>
              <Text style={styles.progressSubtitle}>
                {completedCount} of {planCount} exercises done
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(progress * 100, 100)}%` }]} />
              </View>
            </View>
            <View style={styles.progressRight}>
              <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>
        </View>

        {/* Quick Start Button */}
        {planCount > 0 && (
          <Pressable
            onPress={handleStartWorkout}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: colors.foreground },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <IconSymbol name="play.fill" size={24} color={colors.background} />
            <View>
              <Text style={[styles.startButtonText, { color: colors.background }]}>
                Start Workout
              </Text>
              <Text style={[styles.startButtonSub, { color: colors.background + "99" }]}>
                {planCount} exercises · {formatDuration(totalDuration)}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="trophy.fill"
            label="Streak"
            value={`${state.streak} days`}
            bgColor={colors.warning + "15"}
            iconColor={colors.warning}
            textColor={colors.foreground}
          />
          <StatCard
            icon="flame.fill"
            label="Workouts"
            value={`${state.history.length}`}
            bgColor={colors.error + "15"}
            iconColor={colors.error}
            textColor={colors.foreground}
          />
          <StatCard
            icon="clock.fill"
            label="Minutes"
            value={`${Math.round(state.history.reduce((s, h) => s + h.totalDuration, 0) / 60)}`}
            bgColor={colors.primary + "15"}
            iconColor={colors.primary}
            textColor={colors.foreground}
          />
        </View>

        {/* Awards Preview */}
        {state.unlockedAwards.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Awards</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/profile" as any)}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.awardsRow}>
                {state.unlockedAwards.slice(0, 5).map((awardId) => (
                  <View key={awardId} style={[styles.awardBadge, { backgroundColor: colors.primary + "15" }]}>
                    <IconSymbol name="star.fill" size={20} color={colors.primary} />
                  </View>
                ))}
                {state.unlockedAwards.length > 5 && (
                  <View style={[styles.awardBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.awardMoreText, { color: colors.muted }]}>
                      +{state.unlockedAwards.length - 5}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Today's Plan */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Plan</Text>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                refreshDailyPlan();
              }}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <View style={styles.refreshRow}>
                <IconSymbol name="arrow.clockwise" size={14} color={colors.primary} />
                <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
              </View>
            </Pressable>
          </View>
          {state.dailyPlanEdited && (
            <View style={[styles.editedBadge, { backgroundColor: colors.warning + "15" }]}>
              <Text style={[styles.editedText, { color: colors.warning }]}>Manually edited</Text>
            </View>
          )}
          {planExercises.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="dumbbell.fill" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No exercises in today's plan.{"\n"}Tap refresh to generate one!
              </Text>
            </View>
          ) : (
            planExercises.slice(0, 5).map((exercise, index: number) => {
              const isCompleted = state.todayCompleted.includes(exercise.id);
              return (
                <Pressable
                  key={exercise.id}
                  onPress={() => router.push(`/exercise/${exercise.id}` as any)}
                  style={({ pressed }) => [
                    styles.exerciseRow,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Image source={{ uri: exercise.demoImage }} style={styles.exerciseThumb} contentFit="cover" />
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, { color: colors.foreground }]}>{exercise.name}</Text>
                    <View style={styles.exerciseMetaRow}>
                      <Text style={[styles.exerciseMeta, { color: colors.muted }]}>
                        {exercise.defaultDuration}s
                      </Text>
                      <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[exercise.category].bg }]} />
                      <Text style={[styles.exerciseMeta, { color: colors.muted }]}>
                        {exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {isCompleted ? (
                    <IconSymbol name="checkmark.circle.fill" size={22} color={colors.success} />
                  ) : (
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                  )}
                </Pressable>
              );
            })
          )}
          {planExercises.length > 5 && (
            <Pressable
              onPress={() => router.push("/(tabs)/my-plan" as any)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.moreText, { color: colors.primary }]}>
                View all {planExercises.length} exercises →
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
  iconColor,
  textColor,
}: {
  icon: any;
  label: string;
  value: string;
  bgColor: string;
  iconColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <IconSymbol name={icon} size={20} color={iconColor} />
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: textColor + "99" }]}>{label}</Text>
    </View>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: { fontSize: 14, fontWeight: "500", letterSpacing: 0.2 },
  name: { fontSize: 28, fontWeight: "800", marginTop: 2, letterSpacing: -0.3 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakText: { fontSize: 18, fontWeight: "700" },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  progressCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressLeft: { flex: 1 },
  progressRight: { marginLeft: 16 },
  progressTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 },
  progressSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  progressBarContainer: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  progressPercent: { fontSize: 36, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: { fontSize: 18, fontWeight: "700", letterSpacing: 0.1 },
  startButtonSub: { fontSize: 13, marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  seeAllText: { fontSize: 14, fontWeight: "600" },
  refreshRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  refreshText: { fontSize: 14, fontWeight: "600" },
  editedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  editedText: { fontSize: 12, fontWeight: "600" },
  awardsRow: { flexDirection: "row", gap: 8 },
  awardBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  awardMoreText: { fontSize: 13, fontWeight: "600" },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  exerciseThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E4E4E7",
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: "600" },
  exerciseMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  exerciseMeta: { fontSize: 13 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  moreText: { fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 8 },
});
