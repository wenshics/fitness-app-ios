import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin, getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { notifyAuthChanged } from "@/hooks/use-auth";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    if (isLoading) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsLoading(true);
    try {
      // Use demo login for all platforms - simple and reliable
      const apiUrl = getApiBaseUrl();
      const demoUrl = apiUrl ? `${apiUrl}/api/oauth/demo-login` : "/api/oauth/demo-login";
      console.log("[Login] Demo login to:", demoUrl);
      const response = await fetch(demoUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("[Login] Demo login response:", data);
      
      if (data.sessionToken && data.user) {
        // Store token and user info
        await Auth.setSessionToken(data.sessionToken);
        const userInfo: Auth.User = {
          id: data.user.id,
          openId: data.user.openId,
          name: data.user.name,
          email: data.user.email,
          loginMethod: data.user.loginMethod,
          lastSignedIn: new Date(data.user.lastSignedIn || Date.now()),
        };
        await Auth.setUserInfo(userInfo);
        
        console.log("[Login] User stored, notifying auth changed");
        // Notify auth changed to trigger useAuth to pick up the new user
        notifyAuthChanged();
        
        // Navigate to home screen immediately
        console.log("[Login] Navigating to home screen");
        router.replace("/(tabs)");
      } else {
        throw new Error("No session token or user in response");
      }
    } catch (err) {
      console.error("[Login] Failed to login:", err);
      setIsLoading(false);
    }
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
              disabled={isLoading}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Get Started</Text>
                  <Text style={styles.buttonArrow}> →</Text>
                </>
              )}
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
