import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Platform, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const colors = useColors();
  const [showPaywall, setShowPaywall] = useState(false);

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
                desc="From stretching to gym workouts"
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
                desc="Stay motivated with achievements"
              />
              <PaywallFeature
                icon="bell.fill"
                title="Workout Reminders"
                desc="Never miss a workout session"
              />
              <PaywallFeature
                icon="chart.bar.fill"
                title="Progress Tracking"
                desc="Track your fitness journey"
              />
            </View>

            {/* Price Card */}
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>$1.99</Text>
                <Text style={styles.pricePeriod}>/week</Text>
              </View>
              <Text style={styles.priceNote}>Cancel anytime. Billed weekly.</Text>
            </View>

            {/* Subscribe Button */}
            <Pressable
              onPress={handleSubscribe}
              style={({ pressed }) => [
                styles.subscribeBtn,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
              ]}
            >
              <Text style={styles.subscribeBtnText}>Start Free Trial & Subscribe</Text>
            </Pressable>

            <Text style={styles.trialNote}>
              7-day free trial, then $1.99/week
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
            7-day free trial · $1.99/week · Cancel anytime
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
    paddingHorizontal: 28,
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
    marginBottom: 16,
  },
  paywallHeader: {
    alignItems: "center",
    marginBottom: 32,
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
    gap: 16,
    marginBottom: 32,
  },
  paywallFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  paywallFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  paywallFeatureInfo: { flex: 1 },
  paywallFeatureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  paywallFeatureDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  priceCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pricePeriod: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginLeft: 4,
  },
  priceNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B35",
  },
  trialNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 12,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  legalText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },
});
