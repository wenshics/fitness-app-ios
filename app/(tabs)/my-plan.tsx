import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CATEGORY_COLORS, DIFFICULTY_COLORS, EXERCISES } from "@/constants/exercises";
import { useColors } from "@/hooks/use-colors";
import { useWorkout } from "@/lib/workout-store";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function MyPlanScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, removeFromPlan, addToPlan, reorderPlan, refreshDailyPlan, getTotalPlanDuration } = useWorkout();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<{ id: string; name: string } | null>(null);

  const planExercises = state.dailyPlan
    .map((id: string) => EXERCISES.find((e) => e.id === id))
    .filter(Boolean) as typeof EXERCISES;

  const totalDuration = getTotalPlanDuration();
  const availableExercises = EXERCISES.filter((e) => !state.dailyPlan.includes(e.id));

  const handleRemove = (id: string, name: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowRemoveConfirm({ id, name });
  };

  const confirmRemove = () => {
    if (showRemoveConfirm) {
      removeFromPlan(showRemoveConfirm.id);
      setShowRemoveConfirm(null);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPlan = [...state.dailyPlan];
    [newPlan[index - 1], newPlan[index]] = [newPlan[index], newPlan[index - 1]];
    reorderPlan(newPlan);
  };

  const handleMoveDown = (index: number) => {
    if (index === state.dailyPlan.length - 1) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPlan = [...state.dailyPlan];
    [newPlan[index], newPlan[index + 1]] = [newPlan[index + 1], newPlan[index]];
    reorderPlan(newPlan);
  };

  const handleRefresh = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowRefreshConfirm(true);
  };

  const confirmRefresh = () => {
    refreshDailyPlan();
    setShowRefreshConfirm(false);
  };

  const handleStartWorkout = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/workout-session" as any);
  };

  return (
    <ScreenContainer className="pt-2">
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Today's Plan</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {planExercises.length} exercises · {formatDuration(totalDuration)}
            </Text>
            {state.dailyPlanEdited && (
              <View style={[styles.editedBadge, { backgroundColor: colors.warning + "15" }]}>
                <Text style={[styles.editedText, { color: colors.warning }]}>Manually edited</Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleRefresh}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
            </Pressable>
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
      </View>

      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.primary + "10" }]}>
        <IconSymbol name="sparkles" size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.primary }]}>
          A fresh plan is auto-generated every day. You can also edit it manually.
        </Text>
      </View>

      {planExercises.length === 0 ? (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <IconSymbol name="dumbbell.fill" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No exercises yet</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Tap "Add" to build your workout plan or "Refresh" to auto-generate one
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={planExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isCompleted = state.todayCompleted.includes(item.id);
              return (
                <View
                  style={[
                    styles.planCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isCompleted && { opacity: 0.6 },
                  ]}
                >
                  <Pressable
                    onPress={() => router.push(`/exercise/${item.id}` as any)}
                    style={({ pressed }) => [styles.planCardContent, pressed && { opacity: 0.7 }]}
                  >
                    <Image source={{ uri: item.demoImage }} style={styles.exerciseThumb} contentFit="cover" />
                    <View style={styles.planCardInfo}>
                      <View style={styles.planCardTitleRow}>
                        <Text style={[styles.planCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {isCompleted && (
                          <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
                        )}
                      </View>
                      <View style={styles.planCardMeta}>
                        <View
                          style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[item.difficulty].bg }]}
                        >
                          <Text style={styles.diffText}>{item.difficulty}</Text>
                        </View>
                        <View
                          style={[styles.catBadge, { backgroundColor: CATEGORY_COLORS[item.category].bg + "20" }]}
                        >
                          <Text style={[styles.catText, { color: CATEGORY_COLORS[item.category].bg }]}>
                            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                          </Text>
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
                      <IconSymbol name="chevron.up" size={14} color={colors.muted} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleMoveDown(index)}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { opacity: index === planExercises.length - 1 ? 0.3 : pressed ? 0.5 : 1 },
                      ]}
                    >
                      <IconSymbol name="chevron.down" size={14} color={colors.muted} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemove(item.id, item.name)}
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.5 }]}
                    >
                      <IconSymbol name="xmark.circle.fill" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              );
            }}
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
                  <Image source={{ uri: exercise.demoImage }} style={styles.addExerciseThumb} contentFit="cover" />
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
                        {exercise.defaultDuration}s
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

      {/* Refresh Confirmation Modal */}
      <Modal visible={showRefreshConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Refresh Plan?</Text>
            <Text style={[styles.confirmMessage, { color: colors.muted }]}>
              Generate a new daily plan? Your current edits will be lost.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                onPress={() => setShowRefreshConfirm(false)}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmRefresh}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: "#FFFFFF" }]}>Refresh</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal visible={!!showRemoveConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Remove Exercise?</Text>
            <Text style={[styles.confirmMessage, { color: colors.muted }]}>
              Remove "{showRemoveConfirm?.name}" from today's plan?
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                onPress={() => setShowRemoveConfirm(null)}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmRemove}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: colors.error },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.confirmBtnText, { color: "#FFFFFF" }]}>Remove</Text>
              </Pressable>
            </View>
          </View>
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
  headerContainer: { paddingHorizontal: 20, marginBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 4, letterSpacing: 0.1 },
  editedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  editedText: { fontSize: 11, fontWeight: "600" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
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
  planCardContent: { flex: 1, flexDirection: "row", alignItems: "center", padding: 10, gap: 12 },
  exerciseThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
  },
  planCardInfo: { flex: 1 },
  planCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  planCardTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  planCardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  diffText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF", textTransform: "capitalize" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  planCardDuration: { fontSize: 12 },
  planCardActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    paddingRight: 10,
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
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  addExerciseThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
  },
  addExerciseInfo: { flex: 1 },
  addExerciseName: { fontSize: 15, fontWeight: "600" },
  addExerciseMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(55, 65, 81, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmBox: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  confirmTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  confirmMessage: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  confirmButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  confirmBtnText: { fontSize: 16, fontWeight: "600" },
});
