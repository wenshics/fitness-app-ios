import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    if (isLoading) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsLoading(true);
    try {
      await startOAuthLogin();
    } catch (err) {
      console.error("[Login] Failed to start OAuth:", err);
      setIsLoading(false);
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
        <View style={styles.content}>
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.iconContainer}>
              <IconSymbol name="flame.fill" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>ActiveLife</Text>
            <Text style={styles.subtitle}>Your Daily Exercise Companion</Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <FeatureRow icon="dumbbell.fill" text="30 exercises across 3 categories" />
            <FeatureRow icon="sparkles" text="AI-generated daily workout plans" />
            <FeatureRow icon="timer" text="Built-in timers for every workout" />
            <FeatureRow icon="trophy.fill" text="Awards, streaks & progress tracking" />
          </View>

          {/* CTA */}
          <View style={styles.ctaArea}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                styles.button,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                isLoading && { opacity: 0.7 },
              ]}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#0D9488" />
                  <Text style={styles.buttonText}>Connecting...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.buttonText}>Get Started</Text>
                  <IconSymbol name="arrow.right" size={18} color="#0D9488" />
                </>
              )}
            </Pressable>

            <Text style={styles.disclaimer}>
              Free to browse · Sign in to get started
            </Text>
          </View>
        </View>
      </LinearGradient>
    </ScreenContainer>
  );
}

function FeatureRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconBg}>
        <IconSymbol name={icon} size={16} color="#FFFFFF" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 48,
  },
  logoArea: {
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    fontWeight: "400",
    letterSpacing: 0.2,
  },
  features: {
    width: "100%",
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    flex: 1,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  ctaArea: {
    alignItems: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    gap: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0D9488",
    letterSpacing: 0.2,
  },
  disclaimer: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 16,
    textAlign: "center",
    letterSpacing: 0.1,
  },
});
