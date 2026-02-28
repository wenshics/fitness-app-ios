import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin, getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { notifyAuthChanged } from "@/hooks/use-auth";
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
      // On mobile, use direct login API
      if (Platform.OS !== "web") {
        const apiUrl = getApiBaseUrl();
        console.log("[Login] Mobile login to:", apiUrl);
        const response = await fetch(`${apiUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Login failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("[Login] Login response:", data);
        
        if (data.sessionToken) {
          await Auth.setSessionToken(data.sessionToken);
          if (data.user) {
            const userInfo: Auth.User = {
              id: data.user.id,
              openId: data.user.openId,
              name: data.user.name,
              email: data.user.email,
              loginMethod: data.user.loginMethod,
              lastSignedIn: new Date(data.user.lastSignedIn || Date.now()),
            };
            await Auth.setUserInfo(userInfo);
          }
          notifyAuthChanged();
          // Navigation will happen automatically via useAuth hook
        } else {
          throw new Error("No session token in response");
        }
      } else {
        // On web, use OAuth flow
        await startOAuthLogin();
      }
    } catch (err) {
      console.error("[Login] Failed to login:", err);
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
            <Text style={styles.title}>FitLife</Text>
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

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <IconSymbol name={icon as any} size={20} color="#FFFFFF" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoArea: {
    alignItems: "center",
    marginTop: 20,
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
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  features: {
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  ctaArea: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D9488",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disclaimer: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
});
