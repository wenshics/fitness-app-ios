import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useWorkout } from "@/lib/workout-store";
import { useSubscription } from "@/lib/subscription-store";
import type { PlanType } from "@/lib/subscription-store";
const PLANS = [
  { id: "daily" as const, label: "Daily", price: "$0.99", period: "/day", perWeek: "$6.93/wk", savings: "Save 0%", popular: false },
  { id: "weekly" as const, label: "Weekly", price: "$5.99", period: "/week", perWeek: "$5.99/wk", savings: "Save 14%", popular: false },
  { id: "monthly" as const, label: "Monthly", price: "$19.99", period: "/month", perWeek: "$4.61/wk", savings: "Save 33%", popular: true },
  { id: "yearly" as const, label: "Yearly", price: "$149.99", period: "/year", perWeek: "$2.88/wk", savings: "Save 58%", popular: false },
]
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
  View,
} from "react-native";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
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
  const validReminders = Object.entries(reminders).reduce((acc: any, [key, value]: [string, any]) => {
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

  const handleLogout = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const doLogout = async () => {
      try {
        console.log("[Profile] Starting logout...");
        await logout();
        console.log("[Profile] Logout complete");
      } catch (err) {
        console.error("[Profile] Logout error:", err);
      }
      setTimeout(() => {
        console.log("[Profile] Redirecting to login");
        router.replace("/login" as any);
      }, 100);
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
      updateSettings({ reminders: updated });
      setEditingReminder(null);
    }
  }, [editingReminder, pickerHour, pickerMinute, reminders, updateSettings]);

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

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>

        {/* User Card */}
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
              {user?.name || "User"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.muted }]}>
              {user?.email || "Fitness enthusiast"}
            </Text>
          </View>
        </Pressable>

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
            <Text style={[styles.statValue, { color: colors.primary }]}>{state.streak || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{Math.round((state.history?.reduce((s: number, h: any) => s + (h.totalDuration || 0), 0) || 0) / 60)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Minutes</Text>
          </View>
        </View>

        {/* Awards */}
        <View style={styles.awardsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
          <View style={styles.awardsList}>
            {unlockedAwards.map((award) => (
              <View key={award.id} style={[styles.awardBadge, { backgroundColor: colors.primary + "20" }]}>
                <IconSymbol name={award.icon as any} size={28} color={colors.primary} />
              </View>
            ))}
            {lockedAwards.slice(0, 3).map((award) => (
              <View key={award.id} style={[styles.awardBadge, { backgroundColor: colors.border, opacity: 0.5 }]}>
                <IconSymbol name={award.icon as any} size={28} color={colors.muted} />
              </View>
            ))}
          </View>
        </View>

        {/* Settings Section */}
        {showSettings && (
          <View style={[styles.settingsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
          </View>
        )}

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.error },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 20, marginBottom: 20, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  userEmail: { fontSize: 13 },
  subscriptionBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  subTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  subPrice: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  subRightCol: { alignItems: "flex-end", gap: 8 },
  subBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  subBadgeText: { fontSize: 12, fontWeight: "500", color: "#FFFFFF" },
  changePlanBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.2)" },
  changePlanText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  statsGrid: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  statLabel: { fontSize: 12 },
  awardsSection: { marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  awardsList: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  awardBadge: { width: 56, height: 56, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  awardEmoji: { fontSize: 28 },
  settingsSection: { marginHorizontal: 20, marginBottom: 20, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  settingTitle: { fontSize: 14, fontWeight: "700", paddingHorizontal: 16, paddingTop: 12 },
  settingsList: { marginTop: 8 },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  settingLabel: { fontSize: 13, fontWeight: "500" },
  settingValue: { fontSize: 13, fontWeight: "600" },
  logoutBtn: { marginHorizontal: 20, marginBottom: 20, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  logoutText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 32, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  modalCancel: { fontSize: 16, fontWeight: "500" },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalSave: { fontSize: 16, fontWeight: "600" },
  changePlanNote: { fontSize: 13, paddingHorizontal: 20, marginBottom: 16 },
  plansList: { paddingHorizontal: 20, gap: 12 },
  planOption: { borderWidth: 1.5, borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planOptionLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  planRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  planRadioInner: { width: 10, height: 10, borderRadius: 5 },
  planLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  planOptionLabel: { fontSize: 14, fontWeight: "600" },
  planOptionPerWeek: { fontSize: 12, marginTop: 2 },
  planOptionPrice: { fontSize: 16, fontWeight: "700" },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  confirmDialog: { borderRadius: 16, padding: 24, margin: 20, borderWidth: 1, alignItems: "center" },
  confirmHeader: { marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  confirmMessage: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  confirmButtonsRow: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, alignItems: "center" },
  confirmCancelText: { fontSize: 14, fontWeight: "600" },
  confirmDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#DC2626", alignItems: "center" },
  confirmDeleteText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  currentBadgeText: { fontSize: 11, fontWeight: "600" },
  cancelSubBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "rgba(220,38,38,0.2)" },
  cancelSubText: { fontSize: 12, fontWeight: "600", color: "#DC2626" },
});
