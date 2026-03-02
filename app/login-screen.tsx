import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiBaseUrl } from "@/constants/oauth";

export default function LoginScreen() {
  const colors = useColors("light");
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Use getApiBaseUrl which handles both web and native platforms
      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/api/auth/email-login`;
      console.log("[LoginScreen] Fetching from:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      console.log("[LoginScreen] Response status:", response.status);
      const data = await response.json();
      console.log("[LoginScreen] Response data:", data);

      if (!response.ok) {
        if (data.error?.includes("not found") || data.error?.includes("Invalid")) {
          setError("Email or password is incorrect. Please try again.");
        } else {
          setError(data.error || "Login failed. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      if (data.sessionToken && data.user) {
        console.log("[LoginScreen] Login successful, navigating to home");
        // Use the login() method from useAuth — stores token + user, sets state immediately
        await login(
          {
            id: data.user.id,
            openId: data.user.openId,
            name: data.user.name,
            email: data.user.email,
            loginMethod: data.user.loginMethod,
            lastSignedIn: new Date(data.user.lastSignedIn || Date.now()),
            birthday: data.user.birthday || null,
            heightCm: data.user.heightCm || null,
            weightKg: data.user.weightKg || null,
          },
          data.sessionToken,
        );

        // Navigate to home — user state is already set, no redirect loop possible
        router.replace("/(tabs)");
      } else {
        setError("Invalid response from server. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[LoginScreen] Catch error:", errorMessage, err);
      setError("Network error. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Sign in to your account
              </Text>
            </View>

            <View style={styles.form}>
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.error + "20", borderColor: colors.error }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.field}>
                <View style={styles.passwordLabelRow}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
                  <Pressable onPress={() => router.push("/forgot-password")}>
                    <Text style={[styles.linkText, { color: colors.primary, fontSize: 13 }]}>Forgot password?</Text>
                  </Pressable>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.inputInner, { color: colors.foreground }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    editable={!isLoading}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol
                      name={showPassword ? "eye.slash.fill" : "eye.fill"}
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  isLoading && { opacity: 0.6 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </Pressable>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.muted }]}>
                  Don't have an account?{" "}
                </Text>
                <Pressable onPress={() => router.push("/signup-screen")}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
  },
  form: {
    gap: 16,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
