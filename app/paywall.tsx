import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { subscribe } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("monthly");
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log('[Paywall] User not authenticated, redirecting to login-screen');
      router.replace('/login-screen');
    }
  }, [user, router]);

  const currentPlan = PLANS.find((p) => p.id === selectedPlan)!;

  const handleSubscribe = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Navigate to payment info screen to collect card details
      router.push(`/payment-info?plan=${selectedPlan}`);
    } catch (err) {
      console.error("[Paywall] Navigation failed:", err);
    } finally {
      // Always reset so the button is tappable again when user returns from payment screen
      setIsProcessing(false);
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
        <ScrollView
          contentContainerStyle={styles.paywallContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Close button */}
          <View style={styles.closeRow}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)" as any);
                }
              }}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol name="xmark.circle.fill" size={28} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Header */}
          <View style={styles.paywallHeader}>
            <View style={styles.crownIcon}>
              <IconSymbol name="crown.fill" size={48} color="#FFD700" />
            </View>
            <Text style={styles.paywallTitle}>FitLife Pro</Text>
            <Text style={styles.paywallSubtitle}>
              Unlock your full fitness potential
            </Text>
          </View>

          {/* Features */}
          <View style={styles.paywallFeatures}>
            <PaywallFeature
              icon="dumbbell.fill"
              title="30 Expert Exercises"
              desc="From stretching to gym workouts with animated demos"
            />
            <PaywallFeature
              icon="sparkles"
              title="AI Daily Plans"
              desc="Auto-generated fresh plans every day"
            />
            <PaywallFeature
              icon="timer"
              title="Smart Timer"
              desc="Guided sessions with rest periods"
            />
            <PaywallFeature
              icon="trophy.fill"
              title="Awards & Streaks"
              desc="Stay motivated with 12 achievements"
            />
            <PaywallFeature
              icon="bell.fill"
              title="Workout Reminders"
              desc="Smart reminders for weekdays & weekends"
            />
          </View>

          {/* Plan Selection */}
          <Text style={styles.choosePlanLabel}>Choose Your Plan</Text>
          <View style={styles.plansContainer}>
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => {
                    if (Platform.OS !== "web")
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
                  <View style={styles.planCardInner}>
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.planInfo}>
                      <Text
                        style={[
                          styles.planLabel,
                          isSelected && styles.planLabelSelected,
                        ]}
                      >
                        {plan.label}
                      </Text>
                      <Text
                        style={[
                          styles.planPerWeek,
                          isSelected && styles.planPerWeekSelected,
                        ]}
                      >
                        {plan.perWeek}
                      </Text>
                    </View>
                    <View style={styles.planPriceCol}>
                      <Text
                        style={[
                          styles.planPrice,
                          isSelected && styles.planPriceSelected,
                        ]}
                      >
                        {plan.price}
                      </Text>
                      <Text
                        style={[
                          styles.planPeriod,
                          isSelected && styles.planPeriodSelected,
                        ]}
                      >
                        {plan.period}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Subscribe Button */}
          <Pressable
            onPress={handleSubscribe}
            style={({ pressed }) => [
              styles.subscribeBtn,
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
              isProcessing && { opacity: 0.7 },
            ]}
          >
            {isProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color="#0D9488" />
                <Text style={styles.subscribeBtnText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.subscribeBtnText}>
                Start Free Trial — {currentPlan.price}
                {currentPlan.period}
              </Text>
            )}
          </Pressable>

          <Text style={styles.trialNote}>
            7-day free trial, then {currentPlan.price}
            {currentPlan.period}. Cancel anytime.
          </Text>

          {/* Guarantee */}
          <View style={styles.guaranteeRow}>
            <IconSymbol name="checkmark.shield.fill" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.guaranteeText}>
              Secured by App Store. Cancel anytime in Settings.
            </Text>
          </View>

          {/* Legal */}
          <View style={styles.legalRow}>
            <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={styles.legalText}>Terms of Use</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={styles.legalText}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
              <Text style={styles.legalText}>Restore Purchase</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </ScreenContainer>
  );
}

function PaywallFeature({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.paywallFeatureRow}>
      <View style={styles.paywallFeatureIcon}>
        <IconSymbol name={icon} size={22} color="#FFFFFF" />
      </View>
      <View style={styles.paywallFeatureInfo}>
        <Text style={styles.paywallFeatureTitle}>{title}</Text>
        <Text style={styles.paywallFeatureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  paywallContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  closeRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  paywallHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  crownIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  paywallTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  paywallSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
  },
  paywallFeatures: {
    gap: 14,
    marginBottom: 28,
  },
  paywallFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paywallFeatureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  paywallFeatureInfo: { flex: 1 },
  paywallFeatureTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  paywallFeatureDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  choosePlanLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  plansContainer: {
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  planCardSelected: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "#FFFFFF",
  },
  planCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: "#FFFFFF",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },
  planLabelSelected: {
    color: "#FFFFFF",
  },
  planPerWeek: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  planPerWeekSelected: {
    color: "rgba(255,255,255,0.7)",
  },
  planPriceCol: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "rgba(255,255,255,0.8)",
  },
  planPriceSelected: {
    color: "#FFFFFF",
  },
  planPeriod: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  planPeriodSelected: {
    color: "rgba(255,255,255,0.7)",
  },
  popularBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
    borderBottomRightRadius: 8,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#333",
    letterSpacing: 0.5,
  },
  savingsBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
    borderBottomRightRadius: 8,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  subscribeBtn: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subscribeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D9488",
  },
  trialNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 10,
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  guaranteeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  legalText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
});
