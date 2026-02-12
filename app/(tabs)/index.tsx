import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EXERCISES } from "@/constants/exercises";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useWorkout } from "@/lib/workout-store";
import { useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { state, getPlanExercises, getTotalPlanDuration } = useWorkout();
  const router = useRouter();
  const planExercises = getPlanExercises();
  const totalDuration = getTotalPlanDuration();
  const completedCount = state.todayCompleted.length;
  const planCount = state.plan.length;
  const progress = planCount > 0 ? completedCount / planCount : 0;

  const firstName = user?.name?.split(" ")[0] || "Athlete";
  const greeting = getGreeting();

  const handleStartWorkout = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

        {/* Today's Plan */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Plan</Text>
          {planExercises.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="dumbbell.fill" size={32} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No exercises in your plan yet.{"\n"}Go to "My Plan" to add some!
              </Text>
            </View>
          ) : (
            planExercises.slice(0, 5).map((exercise, index) => {
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
                  <View style={[styles.exerciseIndex, { backgroundColor: isCompleted ? colors.success : colors.primary + "15" }]}>
                    {isCompleted ? (
                      <IconSymbol name="checkmark.circle.fill" size={18} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.exerciseIndexText, { color: colors.primary }]}>{index + 1}</Text>
                    )}
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, { color: colors.foreground }]}>{exercise.name}</Text>
                    <Text style={[styles.exerciseMeta, { color: colors.muted }]}>
                      {exercise.defaultDuration}s · {exercise.muscleGroups[0]}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              );
            })
          )}
          {planExercises.length > 5 && (
            <Text style={[styles.moreText, { color: colors.muted }]}>
              +{planExercises.length - 5} more exercises
            </Text>
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
  greeting: { fontSize: 16 },
  name: { fontSize: 28, fontWeight: "700", marginTop: 2 },
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
  },
  progressCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressLeft: { flex: 1 },
  progressRight: { marginLeft: 16 },
  progressTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
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
  progressPercent: { fontSize: 36, fontWeight: "800", color: "#FFFFFF" },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
  },
  startButtonText: { fontSize: 18, fontWeight: "700" },
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
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseIndexText: { fontSize: 14, fontWeight: "700" },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: "600" },
  exerciseMeta: { fontSize: 13, marginTop: 2 },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  moreText: { fontSize: 13, textAlign: "center", marginTop: 4 },
});
