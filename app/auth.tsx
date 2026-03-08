import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Auth from "@/lib/_core/auth";
import { notifyAuthChanged } from "@/hooks/use-auth";
// Removed getApiBaseUrl import - using dynamic URL construction instead

type AuthMode = "login" | "signup";

export default function AuthScreen() {
  const colors = useColors();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Always construct the full API URL on web
      let url: string;
      const endpoint = mode === "signup" ? "/api/auth/email-signup" : "/api/auth/email-login";
      if (typeof window !== "undefined" && window.location) {
        const { protocol, hostname } = window.location;
        const apiHostname = hostname.replace(/^8081-/, "3000-");
        url = `${protocol}//${apiHostname}${endpoint}`;
      } else {
        // Fallback for non-web platforms - use relative URL
        url = endpoint;
      }

      console.log(`[Auth] ${mode} to:`, url);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await response.json();
      console.log(`[Auth] ${mode} response:`, data);

      if (!response.ok) {
        // Handle specific error messages
        if (mode === "login" && data.error?.includes("not found")) {
          setError("Account not found. Please sign up to create a new account.");
        } else if (mode === "login" && data.error?.includes("not match")) {
          setError("Email or password is incorrect. Please try again.");
        } else if (mode === "signup" && data.error?.includes("already exists")) {
          setError("This email is already registered. Please log in instead.");
        } else {
          setError(data.error || `${mode === "signup" ? "Signup" : "Login"} failed`);
        }
        setIsLoading(false);
        return;
      }

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

        console.log("[Auth] User stored, notifying auth changed");
        notifyAuthChanged();

        // Navigate to home screen
        console.log("[Auth] Navigating to home screen");
        router.replace("/(tabs)");
      } else {
        setError("Invalid response from server");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(`[Auth] ${mode} failed:`, err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScreenContainer edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                {mode === "login"
                  ? "Sign in to your account"
                  : "Join Pulse to start your fitness journey"}
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.error + "20" }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === "login" ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Mode Toggle */}
            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleText, { color: colors.muted }]}>
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <Pressable
                onPress={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setEmail("");
                  setPassword("");
                }}
                disabled={isLoading}
              >
                <Text style={[styles.toggleLink, { color: colors.primary }]}>
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "flex-start",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  errorBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  toggleText: {
    fontSize: 14,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
