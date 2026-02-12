import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { AWARDS, useWorkout } from "@/lib/workout-store";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { state, updateSettings, getUnlockedAwards, getLockedAwards } = useWorkout();

  const totalWorkouts = state.history.length;
  const totalMinutes = Math.round(state.history.reduce((s, h) => s + h.totalDuration, 0) / 60);
  const totalExercises = state.history.reduce((s, h) => s + h.exerciseIds.length, 0);
  const unlockedAwards = getUnlockedAwards();
  const lockedAwards = getLockedAwards();

  const handleLogout = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
  };

  const restTimeOptions = [10, 15, 20, 30];

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
              <Text style={styles.subTitle}>FitLife Pro</Text>
              <Text style={styles.subPrice}>$1.99/week</Text>
            </View>
          </View>
          <View style={[styles.subBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.subBadgeText}>Active</Text>
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

          {/* Unlocked Awards */}
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

          {/* Locked Awards */}
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

        {/* Reminders */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Workout Reminders</Text>
          <View style={[styles.reminderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <IconSymbol name="bell.fill" size={18} color={colors.primary} />
                <Text style={[styles.reminderLabel, { color: colors.foreground }]}>Weekday Evening</Text>
              </View>
              <Text style={[styles.reminderTime, { color: colors.primary }]}>7:30 PM</Text>
            </View>
            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <IconSymbol name="bell.fill" size={18} color={colors.warning} />
                <Text style={[styles.reminderLabel, { color: colors.foreground }]}>Weekend Morning</Text>
              </View>
              <Text style={[styles.reminderTime, { color: colors.warning }]}>8:30 AM</Text>
            </View>
            <View style={[styles.reminderDivider, { backgroundColor: colors.border }]} />
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <IconSymbol name="bell.fill" size={18} color={colors.primary} />
                <Text style={[styles.reminderLabel, { color: colors.foreground }]}>Weekend Evening</Text>
              </View>
              <Text style={[styles.reminderTime, { color: colors.primary }]}>7:30 PM</Text>
            </View>
          </View>
          <Text style={[styles.reminderNote, { color: colors.muted }]}>
            Reminders are sent at 7:30 PM on weekdays, and at 8:30 AM + 7:30 PM on weekends.
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "700" },
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
  userName: { fontSize: 18, fontWeight: "600" },
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
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
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
  reminderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  reminderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  reminderInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  reminderLabel: { fontSize: 15, fontWeight: "500" },
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
});
