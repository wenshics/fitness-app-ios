import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useUser } from "@/lib/user-store";
import { useWorkout } from "@/lib/workout-store";
import { useSubscription } from "@/lib/subscription-store";
import type { PlanType } from "@/lib/subscription-store";
import { scheduleAllReminders, cancelAllReminders, initializeNotifications } from "@/lib/notification-service";
const PLANS = [
  { id: "daily" as const, label: "Daily", price: "$0.99", period: "/day", perWeek: "$6.93/wk", savings: "Save 0%", popular: false },
  { id: "weekly" as const, label: "Weekly", price: "$5.99", period: "/week", perWeek: "$5.99/wk", savings: "Save 14%", popular: false },
  { id: "monthly" as const, label: "Monthly", price: "$19.99", period: "/month", perWeek: "$4.61/wk", savings: "Save 33%", popular: true },
  { id: "yearly" as const, label: "Yearly", price: "$149.99", period: "/year", perWeek: "$2.88/wk", savings: "Save 58%", popular: false },
]
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  const { subscription, getCurrentPlan, isTrialActive, getDaysRemaining, changePlan, canUpgradeTo, cancelSubscription } = useSubscription();
  const router = useRouter();
  const [showUpgradePlan, setShowUpgradePlan] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PlanType | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
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

  const handleUpgradeConfirm = async () => {
    if (!selectedUpgradePlan || selectedUpgradePlan === subscription.plan) {
      setShowUpgradePlan(false);
      return;
    }

    // Navigate to payment screen with selected plan
    setShowUpgradePlan(false);
    router.push({
      pathname: "/payment-info",
      params: { plan: selectedUpgradePlan },
    });
  };

  const handleLogout = async () => {
    console.log('[Profile] Logout button tapped');
    try {
      await logout();
      console.log('[Profile] Logout successful, redirecting to login');
      // Force redirect to login after logout
      router.replace('/login');
    } catch (error) {
      console.error('[Profile] Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleLogin = () => {
    console.log('[Profile] Login button tapped');
    router.replace('/login');
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
                {userProfile?.height ? `${userProfile.height} cm` : "Not set"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Weight</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {userProfile?.weight ? `${userProfile.weight} kg` : "Not set"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Date of Birth</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {userProfile?.dateOfBirth || "Not set"}
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
        <View style={[styles.subscriptionBanner, { backgroundColor: colors.primary }]}>
          <View style={styles.subLeft}>
            <IconSymbol name="crown.fill" size={20} color="#FFD700" />
            <View>
              <Text style={styles.subTitle}>FitLife Pro</Text>
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
            {subscription.plan !== "yearly" && (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedUpgradePlan(subscription.plan as PlanType);
                  setShowUpgradePlan(true);
                }}
                style={({ pressed }) => [
                  styles.changePlanBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.changePlanText}>{isTrialActive() ? "Change" : "Upgrade"} Plan</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setShowCancelConfirm(true)}
              style={({ pressed }) => [
                styles.cancelSubBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.cancelSubText}>Cancel</Text>
            </Pressable>
          </View>
        </View>     {/* Stats */}
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
            <Text style={[styles.statValue, { color: colors.primary }]}>{state.totalCalories || 0}</Text>
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
                    <Text style={styles.achievementIcon}>{award.icon}</Text>
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
      <Modal visible={showUpgradePlan} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowUpgradePlan(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowUpgradePlan(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.modalCancel, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose Plan</Text>
              <Pressable
                onPress={handleUpgradeConfirm}
                disabled={!selectedUpgradePlan || selectedUpgradePlan === subscription.plan}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.modalSave, { color: selectedUpgradePlan && selectedUpgradePlan !== subscription.plan ? colors.primary : colors.muted }]}>
                  {upgradingPlan ? "Loading..." : "Next"}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.changePlanNote, { color: colors.muted }]}>
              Select a plan to upgrade. You can only upgrade to higher tiers, not downgrade.
            </Text>

            <View style={styles.plansList}>
              {PLANS.map((plan: any) => {
                const isSelected = selectedUpgradePlan === plan.id;
                const isCurrent = subscription.plan === plan.id;
                const canUpgrade = canUpgradeTo(plan.id);
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => {
                      setSelectedUpgradePlan(plan.id);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [
                      styles.planOption,
                      { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary + "08" : colors.surface },
                      pressed && { opacity: 0.8 },
                      !canUpgrade && isCurrent && { opacity: 0.6 },
                    ]}
                  >
                    <View style={styles.planOptionLeft}>
                      <View style={[styles.planRadio, { borderColor: isSelected ? colors.primary : colors.border }]}>
                        {isSelected && <View style={[styles.planRadioInner, { backgroundColor: colors.primary }]} />}
                      </View>
                      <View>
                        <View style={styles.planLabelRow}>
                          <Text style={[styles.planOptionLabel, { color: colors.foreground }]}>{plan.label}</Text>
                          {isCurrent && (
                            <View style={[styles.currentBadge, { backgroundColor: colors.primary + "20" }]}>
                              <Text style={[styles.currentBadgeText, { color: colors.primary }]}>Current</Text>
                            </View>
                          )}
                          {plan.popular && !isCurrent && (
                            <View style={[styles.currentBadge, { backgroundColor: colors.warning + "20" }]}>
                              <Text style={[styles.currentBadgeText, { color: colors.warning }]}>Popular</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.planOptionPerWeek, { color: colors.muted }]}>
                          {plan.perWeek}
                          {plan.savings ? " · " + plan.savings : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.planOptionPrice, { color: colors.foreground }]}>
                      {plan.price}
                      <Text style={{ fontSize: 13, color: colors.muted }}>{plan.period}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cancel Subscription Confirmation Modal */}
      <Modal visible={showCancelConfirm} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.confirmDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.confirmHeader}>
              <IconSymbol name="exclamationmark.circle.fill" size={40} color={colors.error} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Cancel Subscription?</Text>
            <Text style={[styles.confirmMessage, { color: colors.muted }]}>
              You'll lose access to all premium features. Your subscription can be reactivated anytime.
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
                onPress={async () => {
                  setIsCanceling(true);
                  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  try {
                    await cancelSubscription();
                    setShowCancelConfirm(false);
                    Alert.alert("Subscription Canceled", "Your subscription has been canceled. You can reactivate it anytime from your profile.");
                  } catch (error) {
                    Alert.alert("Error", "Failed to cancel subscription. Please try again.");
                  } finally {
                    setIsCanceling(false);
                  }
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
    borderBottomColor: "rgba(0,0,0,0.1)",
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
    borderBottomColor: "rgba(0,0,0,0.1)",
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
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
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
});
