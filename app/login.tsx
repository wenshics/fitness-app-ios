import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Platform, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";

type PlanType = "weekly" | "monthly" | "yearly";

interface PricePlan {
  id: PlanType;
  label: string;
  price: string;
  period: string;
  perWeek: string;
  savings?: string;
  popular?: boolean;
}

const PLANS: PricePlan[] = [
  {
    id: "weekly",
    label: "Weekly",
    price: "$1.99",
    period: "/week",
    perWeek: "$1.99/wk",
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "$5.99",
    period: "/month",
    perWeek: "$1.50/wk",
    savings: "Save 25%",
    popular: true,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "$39.99",
    period: "/year",
    perWeek: "$0.77/wk",
    savings: "Save 61%",
  },
];

export default function LoginScreen() {
  const colors = useColors();
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("monthly");

  const handleGetStarted = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowPaywall(true);
  };

  const handleSubscribe = async () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // In production, this would trigger the App Store subscription flow
    // For now, proceed to OAuth login after "subscribing"
    await startOAuthLogin();
  };

  const handleLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await startOAuthLogin();
  };

  if (showPaywall) {
    const currentPlan = PLANS.find((p) => p.id === selectedPlan)!;

    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <LinearGradient
          colors={[colors.primary, "#FF8C5A"]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView contentContainerStyle={styles.paywallContent} showsVerticalScrollIndicator={false}>
            {/* Back button */}
            <Pressable
              onPress={() => setShowPaywall(false)}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            >
              <IconSymbol name="arrow.left" size={22} color="#FFFFFF" />
            </Pressable>

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
                title="25 Expert Exercises"
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
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.planInfo}>
                        <Text style={[styles.planLabel, isSelected && styles.planLabelSelected]}>
                          {plan.label}
                        </Text>
                        <Text style={[styles.planPerWeek, isSelected && styles.planPerWeekSelected]}>
                          {plan.perWeek}
                        </Text>
                      </View>
                      <View style={styles.planPriceCol}>
                        <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                          {plan.price}
                        </Text>
                        <Text style={[styles.planPeriod, isSelected && styles.planPeriodSelected]}>
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
              ]}
            >
              <Text style={styles.subscribeBtnText}>
                Start Free Trial — {currentPlan.price}{currentPlan.period}
              </Text>
            </Pressable>

            <Text style={styles.trialNote}>
              7-day free trial, then {currentPlan.price}{currentPlan.period}. Cancel anytime.
            </Text>

            {/* Restore / Terms */}
            <View style={styles.legalRow}>
              <Pressable onPress={handleLogin} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={styles.legalText}>Restore Purchase</Text>
              </Pressable>
              <Text style={styles.legalDot}>·</Text>
              <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={styles.legalText}>Terms</Text>
              </Pressable>
              <Text style={styles.legalDot}>·</Text>
              <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={styles.legalText}>Privacy</Text>
              </Pressable>
            </View>
          </ScrollView>
        </LinearGradient>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <LinearGradient
        colors={[colors.primary, "#FF8C5A", "#FFB380"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol name="flame.fill" size={72} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>FitLife</Text>
          <Text style={styles.subtitle}>Your Daily Exercise Companion</Text>

          <View style={styles.features}>
            <FeatureRow icon="dumbbell.fill" text="25 exercises across 6 categories" />
            <FeatureRow icon="sparkles" text="AI-generated daily workout plans" />
            <FeatureRow icon="timer" text="Built-in timers for every workout" />
            <FeatureRow icon="trophy.fill" text="Awards, streaks & progress tracking" />
          </View>

          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.button,
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <IconSymbol name="arrow.right" size={20} color="#FF6B35" />
          </Pressable>

          <Text style={styles.disclaimer}>
            7-day free trial · Starting at $0.77/week · Cancel anytime
          </Text>
        </View>
      </LinearGradient>
    </ScreenContainer>
  );
}

function FeatureRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureRow}>
      <IconSymbol name={icon} size={20} color="rgba(255,255,255,0.9)" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function PaywallFeature({ icon, title, desc }: { icon: any; title: string; desc: string }) {
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
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.85)",
    marginTop: 8,
    marginBottom: 40,
  },
  features: {
    width: "100%",
    gap: 16,
    marginBottom: 48,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    flex: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    gap: 8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B35",
  },
  disclaimer: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 16,
    textAlign: "center",
  },
  // Paywall styles
  paywallContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  paywallHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  crownIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  paywallTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  paywallSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
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
    width: 40,
    height: 40,
    borderRadius: 10,
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
  // Plan selection
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
  subscribeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B35",
  },
  trialNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 10,
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
