import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { getOffering, purchasePackage, restorePurchases, waitForInit, saveMockCustomerInfo, PRODUCT_IDS } from "@/lib/_core/purchases";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { ScreenContainer } from "@/components/screen-container";
import type { PurchasesPackage } from "react-native-purchases";

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { onPurchaseSuccess, refreshSubscription } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>("monthly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) router.replace("/login-screen");
  }, [user, router]);

  // Load available packages from RevenueCat — wait for SDK init first
  useEffect(() => {
    waitForInit().then(() => getOffering()).then((offering) => {
      if (offering?.availablePackages?.length) {
        setPackages(offering.availablePackages);
      }
    });
  }, []);

  const currentPlan = PLANS.find((p) => p.id === selectedPlan)!;

  const handleSubscribe = async () => {
    if (isProcessing) return;

    if (packages.length === 0) {
      if (__DEV__) {
        const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const planLabel = selectedPlan === "yearly" ? "Pulse Yearly ($149.99/yr)" : "Pulse Monthly ($19.99/mo)";
        Alert.alert(
          "Simulator Mode",
          `Simulate a 7-day free trial for ${planLabel}?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Start Free Trial",
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const mockCi = {
                  entitlements: {
                    active: {
                      pro: {
                        productIdentifier: `${selectedPlan}_pro`,
                        expirationDate: trialEnd,
                        isActive: true,
                        willRenew: true,
                      },
                    },
                  },
                  activeSubscriptions: [`${selectedPlan}_pro`],
                } as any;
                if (user?.id) saveMockCustomerInfo(mockCi, user.id);
                onPurchaseSuccess(mockCi);
                Alert.alert(
                  "Welcome to Pulse Pro!",
                  "Your 7-day free trial has started.",
                  [{ text: "Let's Go!", onPress: () => {
                    if (router.canDismiss()) router.dismiss();
                    else router.replace("/(tabs)" as any);
                  }}]
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Available on iOS",
          "Subscriptions are purchased through the App Store. Please use the iOS app to subscribe.",
          [{ text: "OK" }]
        );
      }
      return;
    }

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const pkg = packages.find((p) =>
        p.product.identifier === PRODUCT_IDS[selectedPlan]
      ) ?? packages[0];

      const customerInfo = await purchasePackage(pkg);
      if (customerInfo) {
        onPurchaseSuccess(customerInfo);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (router.canDismiss()) router.dismiss();
        else router.replace("/(tabs)" as any);
      }
    } catch (err: any) {
      console.error("[Paywall] Purchase error:", err);
      Alert.alert("Purchase failed", err.message ?? "Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const customerInfo = await restorePurchases();
      if (customerInfo) {
        onPurchaseSuccess(customerInfo);
        await refreshSubscription();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Restored", "Your subscription has been restored!", [
          { text: "OK", onPress: () => {
            if (router.canDismiss()) router.dismiss();
            else router.replace("/(tabs)" as any);
          }},
        ]);
      } else {
        Alert.alert("No purchase found", "No existing subscription found. Please subscribe to continue.");
      }
    } catch (err: any) {
      Alert.alert("Restore failed", err.message ?? "Could not restore purchases. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <LinearGradient
        colors={["#0F766E", "#0D9488", "#14B8A6"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Close */}
          <View style={styles.closeRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (router.canGoBack()) router.back();
                else router.replace("/(tabs)" as any);
              }}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="xmark.circle.fill" size={28} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.crownIcon}>
              <IconSymbol name="crown.fill" size={48} color="#FFD700" />
            </View>
            <Text style={styles.title}>Pulse Pro</Text>
            <Text style={styles.subtitle}>Unlock your full fitness potential</Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <Feature icon="dumbbell.fill" title="30 Expert Exercises" desc="From stretching to gym workouts with animated demos" />
            <Feature icon="sparkles" title="AI Daily Plans" desc="Auto-generated fresh plans every day" />
            <Feature icon="timer" title="Smart Timer" desc="Guided sessions with rest periods" />
            <Feature icon="trophy.fill" title="Awards & Streaks" desc="Stay motivated with 12 achievements" />
            <Feature icon="bell.fill" title="Workout Reminders" desc="Smart reminders for weekdays & weekends" />
          </View>

          {/* Plan selection */}
          <Text style={styles.choosePlan}>Choose Your Plan</Text>
          <View style={styles.plans}>
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPlan(plan.id);
                  }}
                  style={({ pressed }) => [
                    styles.planCard,
                    isSelected && styles.planCardSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                    </View>
                  )}
                  {plan.savings && !plan.popular && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsBadgeText}>{plan.savings}</Text>
                    </View>
                  )}
                  <View style={styles.planRow}>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planLabel, isSelected && styles.textWhite]}>{plan.label}</Text>
                      <Text style={[styles.planPerWeek, isSelected && styles.textWhite70]}>{plan.perWeek}</Text>
                    </View>
                    <View style={styles.planPriceCol}>
                      <Text style={[styles.planPrice, isSelected && styles.textWhite]}>{plan.price}</Text>
                      <Text style={[styles.planPeriod, isSelected && styles.textWhite70]}>{plan.period}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Subscribe button */}
          <Pressable
            onPress={handleSubscribe}
            style={({ pressed }) => [
              styles.subscribeBtn,
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
              isProcessing && { opacity: 0.7 },
            ]}
          >
            {isProcessing ? (
              <View style={styles.row}>
                <ActivityIndicator size="small" color="#0D9488" />
                <Text style={styles.subscribeBtnText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.subscribeBtnText}>
                Start Free Trial — {currentPlan.price}{currentPlan.period}
              </Text>
            )}
          </Pressable>

          <Text style={styles.trialNote}>
            7-day free trial, then {currentPlan.price}{currentPlan.period}. Cancel anytime.
          </Text>

          {/* Guarantee */}
          <View style={styles.guaranteeRow}>
            <IconSymbol name="checkmark.shield.fill" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.guaranteeText}>Secured by App Store. Cancel anytime in Settings.</Text>
          </View>

          {/* Legal */}
          <View style={styles.legalRow}>
            <Pressable onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={styles.legalText}>Terms of Use</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={() => Linking.openURL("https://wenshics.github.io/fitness-app-ios/privacy.html")} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={styles.legalText}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={handleRestore} disabled={isRestoring} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={styles.legalText}>{isRestoring ? "Restoring..." : "Restore Purchase"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </ScreenContainer>
  );
}

function Feature({ icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <IconSymbol name={icon} size={22} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  closeRow: { alignItems: "flex-end", marginBottom: 8 },
  closeBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 28 },
  crownIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 32, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginTop: 6 },
  features: { gap: 14, marginBottom: 28 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  featureTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  featureDesc: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  choosePlan: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 12 },
  plans: { gap: 10, marginBottom: 20 },
  planCard: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  planCardSelected: { backgroundColor: "rgba(255,255,255,0.22)", borderColor: "#FFFFFF" },
  planRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", justifyContent: "center", alignItems: "center" },
  radioSelected: { borderColor: "#FFFFFF" },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" },
  planInfo: { flex: 1 },
  planLabel: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  planPerWeek: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  planPriceCol: { alignItems: "flex-end" },
  planPrice: { fontSize: 20, fontWeight: "800", color: "rgba(255,255,255,0.8)" },
  planPeriod: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  textWhite: { color: "#FFFFFF" },
  textWhite70: { color: "rgba(255,255,255,0.7)" },
  popularBadge: { backgroundColor: "#FFD700", paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", borderBottomRightRadius: 8 },
  popularBadgeText: { fontSize: 10, fontWeight: "800", color: "#333", letterSpacing: 0.5 },
  savingsBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", borderBottomRightRadius: 8 },
  savingsBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.5 },
  subscribeBtn: { backgroundColor: "#FFFFFF", paddingVertical: 16, borderRadius: 30, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  subscribeBtnText: { fontSize: 16, fontWeight: "700", color: "#0D9488" },
  trialNote: { fontSize: 12, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 10 },
  guaranteeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 },
  guaranteeText: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 },
  legalText: { fontSize: 12, color: "rgba(255,255,255,0.5)", textDecorationLine: "underline" },
  legalDot: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
});
