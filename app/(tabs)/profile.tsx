import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useUser } from "@/lib/user-store";
import { useWorkout } from "@/lib/workout-store";
import { useSubscription } from "@/lib/subscription-store";
import { scheduleAllReminders, cancelAllReminders, initializeNotifications } from "@/lib/notification-service";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { useAuthModal } from "@/lib/auth-modal-context";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { userProfile } = useUser();
  const { state, updateSettings, getUnlockedAwards, getLockedAwards } = useWorkout();
  const { subscription, getCurrentPlan, refreshSubscription } = useSubscription();

  // Helpers derived from subscription state
  const getDaysRemaining = () => {
    if (!subscription.expiresAt) return 0;
    const diff = new Date(subscription.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  const isTrialActive = () => {
    if (!subscription.isSubscribed || !subscription.expiresAt) return false;
    // Consider it a trial if subscribed and more than 6 days remain on first period
    return getDaysRemaining() >= 6;
  };
  const router = useRouter();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const defaultReminders = { weekdayEvening: { hour: 18, minute: 0 }, weekendMorning: { hour: 8, minute: 0 }, weekendEvening: { hour: 18, minute: 0 } };
  const reminders = state.settings?.reminders || defaultReminders;
  const [remindersEnabled, setRemindersEnabled] = useState((reminders as any)?.enabled !== false);
  
  const validReminders = Object.entries(reminders).reduce((acc: any, [key, value]: [string, any]) => {
    // Skip the 'enabled' field - only include time objects
    if (key === 'enabled') return acc;
    acc[key] = {
      hour: typeof value?.hour === 'number' ? value.hour : 18,
      minute: typeof value?.minute === 'number' ? value.minute : 0,
    };
    return acc;
  }, {});
  const [localReminders, setLocalReminders] = useState(validReminders);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [pickerHour, setPickerHour] = useState(0);
  const [pickerMinute, setPickerMinute] = useState(0);

  const unlockedAwards = getUnlockedAwards();
  const lockedAwards = getLockedAwards();
  // Initialize notifications on component mount
  useEffect(() => {
    const init = async () => {
      const granted = await initializeNotifications();
      if (granted && remindersEnabled) {
        // Schedule reminders if notifications are enabled
        const settingsWithEnabled = { ...localReminders, enabled: true };
        await scheduleAllReminders(settingsWithEnabled);
      }
    };
    init();
  }, []);

  // Logout is now handled directly in the button onPress

  const openTimePicker = useCallback((key: string) => {
    const current = localReminders[key as keyof typeof localReminders];
    if (current && typeof current === 'object' && 'hour' in current) {
      setPickerHour(current.hour);
      setPickerMinute(current.minute);
    }
    setEditingReminder(key);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [reminders]);

  const saveReminder = useCallback(() => {
    if (editingReminder) {
      const updated = {
        ...localReminders,
        [editingReminder]: { hour: pickerHour, minute: pickerMinute },
      };
      setLocalReminders(updated);
      // Include enabled field when updating settings
      const settingsWithEnabled = { ...updated, enabled: remindersEnabled };
      updateSettings({ reminders: settingsWithEnabled });
      // Reschedule notifications with new times
      if (remindersEnabled) {
        scheduleAllReminders(settingsWithEnabled);
      }
      setEditingReminder(null);
    }
  }, [editingReminder, pickerHour, pickerMinute, reminders, updateSettings, remindersEnabled]);

  const handleLogout = async () => {
    try {
      await logout();
      // AuthGuard handles navigation to login-screen when isAuthenticated → false
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const { showAuthModal } = useAuthModal();

  const handleLogin = () => {
    console.log('[Profile] Login button tapped');
    showAuthModal();
  };

  return (
    <ScreenContainer className="p-0">
      <View style={{ flex: 1, flexDirection: 'column' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>

        {/* User Card - Only show if logged in */}
        {user && (
          <Pressable
            onPress={() => setShowSettings(!showSettings)}
            style={({ pressed }) => [
              styles.userCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.userAvatarText}>
                {(user?.name || "A").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.foreground }]}>
                {user?.name}
              </Text>
              <Text style={[styles.userEmail, { color: colors.muted }]}>
                {user?.email}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Personal Info Section */}
        <View style={[styles.personalInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Height</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {user?.heightCm ? `${user.heightCm} cm` : (userProfile?.height ? `${userProfile.height} cm` : "Not set")}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Weight</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {user?.weightKg ? `${user.weightKg} kg` : (userProfile?.weight ? `${userProfile.weight} kg` : "Not set")}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Date of Birth</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {user?.birthday || userProfile?.dateOfBirth || "Not set"}
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.editButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => router.push({ pathname: "/onboarding", params: { mode: "edit" } })}
          >
            <Text style={[styles.editButtonText, { color: colors.background }]}>Edit Info</Text>
          </Pressable>
        </View>

        {/* Subscription Banner */}
        {subscription.plan ? (
        <View style={[styles.subscriptionBanner, { backgroundColor: colors.primary }]}>
          <View style={styles.subLeft}>
            <IconSymbol name="crown.fill" size={20} color="#FFD700" />
            <View>
              <Text style={styles.subTitle}>Pulse Pro</Text>
              <Text style={styles.subPrice}>
                {getCurrentPlan()?.price ?? "$19.99"}{getCurrentPlan()?.period ?? "/month"}
              </Text>
            </View>
          </View>
          <View style={styles.subRightCol}>
            <View style={[styles.subBadge, { backgroundColor: isTrialActive() ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.2)" }]}>
              <Text style={styles.subBadgeText}>
                {isTrialActive() ? "Trial" : "Active"} · {getDaysRemaining()}d left
              </Text>
            </View>
            {subscription.plan && subscription.plan !== "yearly" && (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/paywall");
                }}
                style={({ pressed }) => [
                  styles.changePlanBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.changePlanText}>{isTrialActive() ? "Change" : "Upgrade"} Plan</Text>
              </Pressable>
            )}
            {subscription.plan && (
            <Pressable
              onPress={() => setShowCancelConfirm(true)}
              style={({ pressed }) => [
                styles.cancelSubBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.cancelSubText}>Cancel</Text>
            </Pressable>
            )}
          </View>
        </View>
        ) : (
        <View style={[styles.subscriptionBanner, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
          <View style={styles.subLeft}>
            <IconSymbol name="lock.fill" size={20} color={colors.muted} />
            <View>
              <Text style={[styles.subTitle, { color: colors.foreground }]}>No Active Subscription</Text>
              <Text style={[styles.subPrice, { color: colors.muted }]}>Start your 7-day free trial</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push({
              pathname: "/paywall",
              params: { from: "profile" },
            })}
            style={({ pressed }) => [{
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Text style={[styles.changePlanText, { color: colors.background }]}>Subscribe</Text>
          </Pressable>
        </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{state.history?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Workouts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{state.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{Math.round(state.history?.reduce((total, h) => total + h.exerciseIds.length * 5, 0) || 0)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Calories</Text>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <View style={styles.achievementsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
            <Text style={[styles.achievementCount, { color: colors.muted }]}>
              {unlockedAwards.length}/{unlockedAwards.length + lockedAwards.length}
            </Text>
          </View>

          {/* Unlocked Achievements */}
          {unlockedAwards.length > 0 && (
            <View>
              <Text style={[styles.achievementSubtitle, { color: colors.muted }]}>Unlocked</Text>
              <View style={styles.achievementGrid}>
                {unlockedAwards.map((award) => (
                  <Pressable
                    key={award.id}
                    style={({ pressed }) => [
                      styles.achievementBadge,
                      { backgroundColor: colors.surface },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert(award.name, award.description);
                    }}
                  >
                    <View style={[styles.achievementIconWrapper, { backgroundColor: colors.primary + "18" }]}>
                      <IconSymbol
                        name={award.icon as any}
                        size={26}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={[styles.achievementName, { color: colors.foreground }]}>
                      {award.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Locked Achievements */}
          {lockedAwards.length > 0 && (
            <View>
              <Text style={[styles.achievementSubtitle, { color: colors.muted }]}>Locked</Text>
              <View style={styles.achievementGrid}>
                {lockedAwards.map((award) => (
                  <Pressable
                    key={award.id}
                    style={({ pressed }) => [
                      styles.achievementBadge,
                      { backgroundColor: colors.surface, opacity: 0.5 },
                      pressed && { opacity: 0.3 },
                    ]}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert(award.name, award.description);
                    }}
                  >
                    <Text style={[styles.achievementIcon, { opacity: 0.5 }]}>🔒</Text>
                    <Text style={[styles.achievementName, { color: colors.muted }]}>
                      {award.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Workout Reminders Section - Always Visible */}
        {user && (
          <View style={[styles.remindersSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.reminderHeader}>
              <View style={styles.reminderTitleContainer}>
                <IconSymbol name="bell.fill" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Workout Reminders</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: remindersEnabled ? colors.primary : colors.border }]}>
                <Pressable
                  onPress={() => {
                    const newEnabled = !remindersEnabled;
                    setRemindersEnabled(newEnabled);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const settingsWithEnabled = { ...localReminders, enabled: newEnabled };
                    updateSettings({ reminders: settingsWithEnabled });
                    if (newEnabled) {
                      scheduleAllReminders(settingsWithEnabled);
                    } else {
                      cancelAllReminders();
                    }
                  }}
                  style={[styles.toggleInner, { transform: [{ translateX: remindersEnabled ? 20 : 0 }], backgroundColor: 'white' }]}
                />
              </View>
            </View>

            {remindersEnabled && (
              <View style={styles.remindersList}>
                {Object.entries(localReminders).map(([key, value]: [string, any]) => {
                  const hour = value?.hour ?? 18;
                  const minute = value?.minute ?? 0;
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                  const timeString = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
                  
                  return (
                    <Pressable
                      key={key}
                      onPress={() => openTimePicker(key)}
                      style={({ pressed }) => [
                        styles.reminderRow,
                        { borderBottomColor: colors.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.reminderLabel, { color: colors.foreground }]}>
                        {key === 'weekdayEvening' ? 'Weekday Evening' : key === 'weekendMorning' ? 'Weekend Morning' : 'Weekend Evening'}
                      </Text>
                      <Text style={[styles.reminderTime, { color: colors.primary }]}>
                        {timeString}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Settings Section */}
        {showSettings && user && (
          <View style={[styles.settingsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={() => setRemindersEnabled(!remindersEnabled)}
              style={({ pressed }) => [
                styles.settingRow,
                { borderBottomColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Notifications
              </Text>
              <View style={[styles.toggle, { backgroundColor: remindersEnabled ? colors.primary : colors.border }]}>
                <View
                  style={[
                    styles.toggleInner,
                    {
                      transform: [{ translateX: remindersEnabled ? 20 : 0 }],
                      backgroundColor: 'white',
                    },
                  ]}
                />
              </View>
            </Pressable>

            {remindersEnabled && (
              <>
                <Text style={[styles.settingTitle, { color: colors.foreground }]}>Reminder Times</Text>
                <View style={styles.settingsList}>
                  {Object.entries(localReminders).map(([key, value]: [string, any]) => (
                    <Pressable
                      key={key}
                      onPress={() => openTimePicker(key)}
                      style={({ pressed }) => [
                        styles.settingRow,
                        { borderBottomColor: colors.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </Text>
                      <Text style={[styles.settingValue, { color: colors.primary }]}>
                        {String(value?.hour ?? 18).padStart(2, "0")}:{String(value?.minute ?? 0).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

      </ScrollView>
      
      {/* Login/Logout Button - Outside ScrollView */}
      <View style={{ padding: 20, backgroundColor: colors.background }}>
        <TouchableOpacity
          onPress={user ? handleLogout : handleLogin}
          activeOpacity={0.7}
          style={[{ backgroundColor: user ? colors.error : colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' }]}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {user ? 'Log Out' : 'Log In'}
          </Text>
        </TouchableOpacity>
      </View>
      </View>

      {/* Upgrade Plan Modal */}
      {/* Cancel Subscription Confirmation Modal */}
      <Modal visible={showCancelConfirm} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(55, 65, 81, 0.4)" }]}>
          <View style={[styles.confirmDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.confirmHeader}>
              <IconSymbol name="exclamationmark.circle.fill" size={40} color={colors.error} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Cancel Subscription?</Text>
            <Text style={[styles.confirmMessage, { color: colors.muted }]}>
              To cancel, go to iOS Settings → Apple ID → Subscriptions → Pulse. Your access continues until the billing period ends.
            </Text>
            <View style={styles.confirmButtonsRow}>
              <Pressable
                onPress={() => setShowCancelConfirm(false)}
                disabled={isCanceling}
                style={({ pressed }) => [
                  styles.confirmCancelBtn,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={[styles.confirmCancelText, { color: colors.foreground }]}>Keep Subscription</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowCancelConfirm(false);
                  // Apple IAP subscriptions must be cancelled through iOS Settings
                  Linking.openURL("https://apps.apple.com/account/subscriptions");
                }}
                disabled={isCanceling}
                style={({ pressed }) => [
                  styles.confirmDeleteBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {isCanceling ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Cancel Subscription</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={editingReminder !== null} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setEditingReminder(null)}>
          <Pressable
            style={[styles.timePickerModal, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.timePickerHeader}>
              <Pressable onPress={() => setEditingReminder(null)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.timePickerCancel, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.timePickerTitle, { color: colors.foreground }]}>
                {editingReminder ? editingReminder.replace(/([A-Z])/g, " $1").trim() : ""}
              </Text>
              <Pressable onPress={saveReminder} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.timePickerSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>

            <View style={styles.timePickerContent}>
              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: colors.muted }]}>Hour</Text>
                <FlatList
                  data={Array.from({ length: 24 }, (_, i) => i)}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setPickerHour(item)}
                      style={[
                        styles.pickerItem,
                        pickerHour === item && { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          { color: pickerHour === item ? colors.primary : colors.foreground },
                        ]}
                      >
                        {String(item).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  )}
                  keyExtractor={(item) => item.toString()}
                  scrollEventThrottle={16}
                  nestedScrollEnabled={true}
                />
              </View>

              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: colors.muted }]}>Minute</Text>
                <FlatList
                  data={Array.from({ length: 60 }, (_, i) => i)}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setPickerMinute(item)}
                      style={[
                        styles.pickerItem,
                        pickerMinute === item && { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          { color: pickerMinute === item ? colors.primary : colors.foreground },
                        ]}
                      >
                        {String(item).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  )}
                  keyExtractor={(item) => item.toString()}
                  scrollEventThrottle={16}
                  nestedScrollEnabled={true}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  userCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  personalInfoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  editButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  subscriptionBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  subPrice: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  subRightCol: {
    alignItems: "flex-end",
    gap: 8,
  },
  subBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "white",
  },
  changePlanBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changePlanText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  cancelSubBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelSubText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  achievementsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  achievementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  achievementCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  achievementSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  achievementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  achievementBadge: {
    width: "31%",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  achievementName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  settingsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  settingsList: {
    paddingHorizontal: 0,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  toggleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(55, 65, 81, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4E7",
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSave: {
    fontSize: 16,
    fontWeight: "600",
  },
  changePlanNote: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  plansList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  planOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  planOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  planOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  planOptionPerWeek: {
    fontSize: 12,
  },
  planOptionPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  confirmDialog: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmHeader: {
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  confirmButtonsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  timePickerModal: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: "60%",
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4E7",
  },
  timePickerCancel: {
    fontSize: 16,
    fontWeight: "500",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  timePickerSave: {
    fontSize: 16,
    fontWeight: "600",
  },
  timePickerContent: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    minHeight: 200,
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
    maxHeight: 300,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: "600",
  },
  remindersSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reminderTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  remindersList: {
    paddingHorizontal: 0,
  },
  reminderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reminderLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  reminderTime: {
    fontSize: 14,
    fontWeight: "600",
  },
});
