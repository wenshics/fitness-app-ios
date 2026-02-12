import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { DIFFICULTY_COLORS, EXERCISES } from "@/constants/exercises";
import { useColors } from "@/hooks/use-colors";
import { useWorkout } from "@/lib/workout-store";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View, Modal, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";

export default function MyPlanScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, removeFromPlan, addToPlan, reorderPlan, getTotalPlanDuration } = useWorkout();
  const [showAddModal, setShowAddModal] = useState(false);

  const planExercises = state.plan
    .map((id) => EXERCISES.find((e) => e.id === id))
    .filter(Boolean) as typeof EXERCISES;

  const totalDuration = getTotalPlanDuration();
  const availableExercises = EXERCISES.filter((e) => !state.plan.includes(e.id));

  const handleRemove = (id: string, name: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Exercise", `Remove "${name}" from your plan?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeFromPlan(id),
      },
    ]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPlan = [...state.plan];
    [newPlan[index - 1], newPlan[index]] = [newPlan[index], newPlan[index - 1]];
    reorderPlan(newPlan);
  };

  const handleMoveDown = (index: number) => {
    if (index === state.plan.length - 1) return;
    const newPlan = [...state.plan];
    [newPlan[index], newPlan[index + 1]] = [newPlan[index + 1], newPlan[index]];
    reorderPlan(newPlan);
  };

  const handleStartWorkout = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/workout-session" as any);
  };

  return (
    <ScreenContainer className="pt-2">
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>My Plan</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {planExercises.length} exercises · {formatDuration(totalDuration)}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <IconSymbol name="plus.circle.fill" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {planExercises.length === 0 ? (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <IconSymbol name="dumbbell.fill" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No exercises yet</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Tap "Add" to build your custom workout plan
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={planExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View
                style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.orderBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/exercise/${item.id}` as any)}
                  style={({ pressed }) => [styles.planCardContent, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.planCardInfo}>
                    <Text style={[styles.planCardTitle, { color: colors.foreground }]}>{item.name}</Text>
                    <View style={styles.planCardMeta}>
                      <View
                        style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[item.difficulty].bg }]}
                      >
                        <Text style={styles.diffText}>{item.difficulty}</Text>
                      </View>
                      <Text style={[styles.planCardDuration, { color: colors.muted }]}>
                        {item.defaultDuration}s
                      </Text>
                    </View>
                  </View>
                </Pressable>
                <View style={styles.planCardActions}>
                  <Pressable
                    onPress={() => handleMoveUp(index)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { opacity: index === 0 ? 0.3 : pressed ? 0.5 : 1 },
                    ]}
                  >
                    <IconSymbol name="arrow.up.arrow.down" size={14} color={colors.muted} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleRemove(item.id, item.name)}
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.5 }]}
                  >
                    <IconSymbol name="xmark.circle.fill" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            )}
          />

          {/* Start Workout Button */}
          <View style={styles.bottomBar}>
            <Pressable
              onPress={handleStartWorkout}
              style={({ pressed }) => [
                styles.startWorkoutBtn,
                { backgroundColor: colors.primary },
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
              ]}
            >
              <IconSymbol name="play.fill" size={22} color="#FFFFFF" />
              <Text style={styles.startWorkoutText}>Start Workout</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Add Exercise Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Exercise</Text>
            <Pressable
              onPress={() => setShowAddModal(false)}
              style={({ pressed }) => [pressed && { opacity: 0.5 }]}
            >
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          {availableExercises.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                All exercises are already in your plan!
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalList}>
              {availableExercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addToPlan(exercise.id);
                  }}
                  style={({ pressed }) => [
                    styles.addExerciseCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.addExerciseInfo}>
                    <Text style={[styles.addExerciseName, { color: colors.foreground }]}>
                      {exercise.name}
                    </Text>
                    <View style={styles.addExerciseMeta}>
                      <View
                        style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[exercise.difficulty].bg }]}
                      >
                        <Text style={styles.diffText}>{exercise.difficulty}</Text>
                      </View>
                      <Text style={[styles.planCardDuration, { color: colors.muted }]}>
                        {exercise.defaultDuration}s · {exercise.muscleGroups[0]}
                      </Text>
                    </View>
                  </View>
                  <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins}m ${secs}s`;
}

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 20, marginBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 4 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  orderBadge: {
    width: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
  },
  orderText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  planCardContent: { flex: 1, padding: 14 },
  planCardInfo: {},
  planCardTitle: { fontSize: 16, fontWeight: "600" },
  planCardMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  diffText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  planCardDuration: { fontSize: 13 },
  planCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 12,
  },
  actionBtn: { padding: 4 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
  },
  startWorkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
  },
  startWorkoutText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  modalContainer: { flex: 1, paddingTop: 20 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  modalEmpty: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalList: { paddingHorizontal: 20, paddingBottom: 40 },
  addExerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  addExerciseInfo: { flex: 1 },
  addExerciseName: { fontSize: 16, fontWeight: "600" },
  addExerciseMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
});
