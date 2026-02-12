import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useWorkout } from "@/lib/workout-store";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { state, updateSettings } = useWorkout();

  const totalWorkouts = state.history.length;
  const totalMinutes = Math.round(state.history.reduce((s, h) => s + h.totalDuration, 0) / 60);
  const totalExercises = state.history.reduce((s, h) => s + h.exerciseIds.length, 0);

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
    marginBottom: 24,
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
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
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
