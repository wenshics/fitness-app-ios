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
              isLoading && { opacity: 0.7 },
            ]}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.buttonText}>Connecting...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.buttonText}>Get Started</Text>
                <IconSymbol name="arrow.right" size={20} color="#FF6B35" />
              </>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            Free to browse · Sign in to get started
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
});
