import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleGetStarted = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Navigate to login screen
    router.push("/login-screen");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            <Text style={styles.title}>Pulse</Text>
            <Text style={styles.subtitle}>Your Daily Exercise Companion</Text>
          </View>

          {/* Features list */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <IconSymbol name="dumbbell.fill" size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>30 exercises across 3 categories</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="sparkles" size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>AI-generated daily workout plans</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="timer" size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>Built-in timers for every workout</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="star.fill" size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>Awards, streaks & progress tracking</Text>
            </View>
          </View>

          {/* CTA Button */}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Text style={styles.buttonArrow}> →</Text>
            </Pressable>
            <Text style={styles.subtext}>Free to browse · Sign in to get started</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  logoArea: {
    alignItems: "center",
    marginTop: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  featuresList: {
    gap: 16,
    marginVertical: 40,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F766E",
  },
  buttonArrow: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F766E",
  },
  subtext: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
});
