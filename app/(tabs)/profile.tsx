import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { AWARDS, useWorkout, DEFAULT_REMINDERS, type ReminderSettings } from "@/lib/workout-store";
import { useSubscription } from "@/lib/subscription-store";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";

// ===== TIME PICKER HELPERS =====
function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

type ReminderKey = "weekdayEvening" | "weekendMorning" | "weekendEvening";

const REMINDER_LABELS: Record<ReminderKey, { label: string; icon: string; color: "primary" | "warning" }> = {
  weekdayEvening: { label: "Weekday Evening", icon: "bell.fill", color: "primary" },
  weekendMorning: { label: "Weekend Morning", icon: "bell.fill", color: "warning" },
  weekendEvening: { label: "Weekend Evening", icon: "bell.fill", color: "primary" },
};

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { state, updateSettings, getUnlockedAwards, getLockedAwards } = useWorkout();
  const { subscription, getCurrentPlan, isTrialActive, getDaysRemaining } = useSubscription();
  const router = useRouter();

  const [editingReminder, setEditingReminder] = useState<ReminderKey | null>(null);
  const [pickerHour, setPickerHour] = useState(0);
  const [pickerMinute, setPickerMinute] = useState(0);

  const reminders = state.settings.reminders || DEFAULT_REMINDERS;

  const totalWorkouts = state.history.length;
  const totalMinutes = Math.round(state.history.reduce((s, h) => s + h.totalDuration, 0) / 60);
  const totalExercises = state.history.reduce((s, h) => s + h.exerciseIds.length, 0);
  const unlockedAwards = getUnlockedAwards();
  const lockedAwards = getLockedAwards();

  const handleLogout = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const doLogout = async () => {
      try {
        await logout();
      } catch (err) {
        console.error("[Profile] Logout error:", err);
      }
      router.replace("/login" as any);
    };

    if (Platform.OS === "web") {
      doLogout();
    } else {
      Alert.alert(
        "Log Out",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log Out", style: "destructive", onPress: doLogout },
        ],
      );
    }
  };

  const openTimePicker = useCallback((key: ReminderKey) => {
    const current = reminders[key];
    setPickerHour(current.hour);
    setPickerMinute(current.minute);
    setEditingReminder(key);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [reminders]);

  const saveTime = useCallback(() => {
    if (!editingReminder) return;
    const updatedReminders: ReminderSettings = {
      ...reminders,
      [editingReminder]: { hour: pickerHour, minute: pickerMinute },
    };
    updateSettings({ reminders: updatedReminders });
    setEditingReminder(null);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editingReminder, pickerHour, pickerMinute, reminders, updateSettings]);

  const toggleReminders = useCallback((enabled: boolean) => {
    updateSettings({
      reminders: { ...reminders, enabled },
    });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [reminders, updateSettings]);

  const restTimeOptions = [10, 15, 20, 30];

  const reminderKeys: ReminderKey[] = ["weekdayEvening", "weekendMorning", "weekendEvening"];

  return (
    <ScreenContainer className="pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(user?.name || "A").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user?.name || "Athlete"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.muted }]}>
              {user?.email || "Fitness enthusiast"}
            </Text>
          </View>
        </View>

        {/* Subscription Banner */}
        <View style={[styles.subscriptionBanner, { backgroundColor: colors.primary }]}>
          <View style={styles.subLeft}>
            <IconSymbol name="crown.fill" size={20} color="#FFD700" />
            <View>
              <Text style={styles.subTitle}>ActiveLife Pro</Text>
              <Text style={styles.subPrice}>
                {getCurrentPlan()?.price ?? "$1.99"}{getCurrentPlan()?.period ?? "/week"}
              </Text>
            </View>
          </View>
          <View style={[styles.subBadge, { backgroundColor: isTrialActive() ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.subBadgeText}>
              {isTrialActive() ? "Trial" : "Active"} · {getDaysRemaining()}d left
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="flame.fill" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{state.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="trophy.fill" size={24} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalWorkouts}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Workouts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="clock.fill" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalMinutes}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Minutes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="dumbbell.fill" size={24} color={colors.error} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalExercises}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Exercises</Text>
          </View>
        </View>

        {/* Awards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Awards</Text>
            <Text style={[styles.awardCount, { color: colors.muted }]}>
              {unlockedAwards.length}/{AWARDS.length}
            </Text>
          </View>

          {unlockedAwards.length > 0 && (
            <View style={styles.awardsGrid}>
              {unlockedAwards.map((award) => (
                <View
                  key={award.id}
                  style={[styles.awardCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}
                >
                  <View style={[styles.awardIcon, { backgroundColor: colors.primary + "20" }]}>
                    <IconSymbol name={award.icon as any} size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.awardName, { color: colors.foreground }]} numberOfLines={1}>
                    {award.name}
                  </Text>
                  <Text style={[styles.awardDesc, { color: colors.muted }]} numberOfLines={2}>
                    {award.description}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {lockedAwards.length > 0 && (
            <>
              <Text style={[styles.lockedTitle, { color: colors.muted }]}>Locked</Text>
              <View style={styles.awardsGrid}>
                {lockedAwards.map((award) => (
                  <View
                    key={award.id}
                    style={[styles.awardCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.6 }]}
                  >
                    <View style={[styles.awardIcon, { backgroundColor: colors.border }]}>
                      <IconSymbol name="lock.fill" size={20} color={colors.muted} />
                    </View>
                    <Text style={[styles.awardName, { color: colors.muted }]} numberOfLines={1}>
                      {award.name}
                    </Text>
                    <Text style={[styles.awardDesc, { color: colors.muted }]} numberOfLines={2}>
                      {award.description}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Workout Reminders — Editable */}
        <View style={styles.section}>
          <View style={styles.reminderHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Workout Reminders</Text>
            <Switch
              value={reminders.enabled}
              onValueChange={toggleReminders}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={reminders.enabled ? colors.primary : colors.muted}
            />
          </View>

          <View style={[styles.reminderCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: reminders.enabled ? 1 : 0.5 }]}>
            {reminderKeys.map((key, index) => {
              const info = REMINDER_LABELS[key];
              const time = reminders[key];
              const iconColor = info.color === "warning" ? colors.warning : colors.primary;
              return (
                <View key={key}>
                  {index > 0 && <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />}
                  <Pressable
                    onPress={() => reminders.enabled && openTimePicker(key)}
                    style={({ pressed }) => [
                      styles.reminderRow,
                      pressed && reminders.enabled && { opacity: 0.7 },
                    ]}
                    disabled={!reminders.enabled}
                  >
                    <View style={styles.reminderInfo}>
                      <IconSymbol name={info.icon as any} size={18} color={iconColor} />
                      <Text style={[styles.reminderLabel, { color: colors.foreground }]}>{info.label}</Text>
                    </View>
                    <View style={styles.reminderRight}>
                      <Text style={[styles.reminderTime, { color: iconColor }]}>
                        {formatTime(time.hour, time.minute)}
                      </Text>
                      <IconSymbol name="chevron.right" size={14} color={colors.muted} />
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Text style={[styles.reminderNote, { color: colors.muted }]}>
            Tap a time to change it. Reminders are sent on weekdays (evening) and weekends (morning + evening).
          </Text>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settings</Text>

          <View style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <IconSymbol name="timer" size={20} color={colors.primary} />
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Rest Time</Text>
              </View>
              <View style={styles.restOptions}>
                {restTimeOptions.map((time) => (
                  <Pressable
                    key={time}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateSettings({ restTime: time });
                    }}
                    style={({ pressed }) => [
                      styles.restOption,
                      {
                        backgroundColor:
                          state.settings.restTime === time ? colors.primary : colors.background,
                        borderColor: state.settings.restTime === time ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.restOptionText,
                        {
                          color: state.settings.restTime === time ? "#FFFFFF" : colors.foreground,
                        },
                      ]}
                    >
                      {time}s
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              { backgroundColor: colors.error + "10", borderColor: colors.error + "30" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={editingReminder !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingReminder(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditingReminder(null)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setEditingReminder(null)}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingReminder ? REMINDER_LABELS[editingReminder].label : "Set Time"}
              </Text>
              <Pressable
                onPress={saveTime}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>

            {/* Current selected time display */}
            <View style={[styles.timeDisplay, { backgroundColor: colors.surface }]}>
              <Text style={[styles.timeDisplayText, { color: colors.primary }]}>
                {formatTime(pickerHour, pickerMinute)}
              </Text>
            </View>

            {/* Hour and Minute selectors */}
            <View style={styles.pickerContainer}>
              {/* Hour Column */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: colors.muted }]}>Hour</Text>
                <ScrollView
                  style={[styles.pickerScroll, { borderColor: colors.border }]}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8 }}
                >
                  {HOURS.map((h) => {
                    const isSelected = h === pickerHour;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => {
                          setPickerHour(h);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={({ pressed }) => [
                          styles.pickerItem,
                          isSelected && { backgroundColor: colors.primary + "15" },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            { color: isSelected ? colors.primary : colors.foreground },
                            isSelected && { fontWeight: "700" },
                          ]}
                        >
                          {(h % 12 || 12).toString()} {h < 12 ? "AM" : "PM"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Minute Column */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: colors.muted }]}>Minute</Text>
                <ScrollView
                  style={[styles.pickerScroll, { borderColor: colors.border }]}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8 }}
                >
                  {MINUTES.map((m) => {
                    const isSelected = m === pickerMinute;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => {
                          setPickerMinute(m);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={({ pressed }) => [
                          styles.pickerItem,
                          isSelected && { backgroundColor: colors.primary + "15" },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            { color: isSelected ? colors.primary : colors.foreground },
                            isSelected && { fontWeight: "700" },
                          ]}
                        >
                          :{m.toString().padStart(2, "0")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: "700", letterSpacing: 0.1 },
  userEmail: { fontSize: 14, marginTop: 2 },
  subscriptionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  subLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  subTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  subPrice: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  subBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  subBadgeText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: "47%",
    flexGrow: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 13 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12, letterSpacing: -0.2 },
  awardCount: { fontSize: 14, fontWeight: "600" },
  awardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  awardCard: {
    width: "47%",
    flexGrow: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  awardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  awardName: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  awardDesc: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  lockedTitle: { fontSize: 14, fontWeight: "600", marginTop: 16, marginBottom: 10 },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reminderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  reminderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  reminderInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  reminderLabel: { fontSize: 15, fontWeight: "500" },
  reminderRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  reminderTime: { fontSize: 15, fontWeight: "700" },
  reminderDivider: { height: 1, marginVertical: 10 },
  reminderNote: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  settingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  settingRow: { gap: 12 },
  settingInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingLabel: { fontSize: 16, fontWeight: "600" },
  restOptions: { flexDirection: "row", gap: 8 },
  restOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  restOptionText: { fontSize: 14, fontWeight: "600" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutText: { fontSize: 16, fontWeight: "600" },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalCancel: { fontSize: 16, fontWeight: "500" },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalSave: { fontSize: 16, fontWeight: "700" },
  timeDisplay: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  timeDisplayText: { fontSize: 36, fontWeight: "800" },
  pickerContainer: {
    flexDirection: "row",
    gap: 16,
    height: 220,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pickerScroll: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 1,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
