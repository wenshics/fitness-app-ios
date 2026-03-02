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
import { getApiBaseUrl } from "@/constants/oauth";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SignupScreen() {
  const colors = useColors("light");
  const router = useRouter();
  const { login } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Validation helpers
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError("Please enter your email");
      return false;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!password.trim()) {
      setError("Please enter a password");
      return false;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (!name.trim()) {
      setError("Please enter your name");
      return false;
    }

    if (!birthday.trim()) {
      setError("Please enter your birthday (YYYY-MM-DD)");
      return false;
    }

    if (!height.trim()) {
      setError("Please enter your height in cm");
      return false;
    }

    if (!weight.trim()) {
      setError("Please enter your weight in kg");
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const apiUrl = getApiBaseUrl();
      const endpoint = "/api/auth/email-signup";
      const url = apiUrl ? `${apiUrl}${endpoint}` : endpoint;

      console.log("[Signup] Attempting signup to:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          name: name.trim(),
          birthday: birthday.trim(),
          height: parseFloat(height),
          weight: parseFloat(weight),
        }),
      });

      const data = await response.json();
      console.log("[Signup] Response:", data);

      if (!response.ok) {
        if (data.error?.includes("already exists") || data.error?.includes("already registered")) {
          setError("This email is already registered. Please log in instead.");
        } else {
          setError(data.error || "Signup failed");
        }
        setIsLoading(false);
        return;
      }

      if (data.sessionToken && data.user) {
        // Store session so user is logged in after verification
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

        // Send verification code email
        try {
          const verifyUrl = apiUrl ? `${apiUrl}/api/auth/send-verification` : "/api/auth/send-verification";
          await fetch(verifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase() }),
          });
        } catch {
          // Non-fatal — user can resend from verify screen
          console.warn("[Signup] Failed to send verification email");
        }

        // Navigate to email verification screen
        router.replace({ pathname: "/verify-email", params: { email: email.trim().toLowerCase() } });
      } else {
        setError("Invalid response from server. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("[Signup] Error:", err);
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
              <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Join Pulse to start your fitness journey
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
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.inputInner, { color: colors.foreground }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
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

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Confirm Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.inputInner, { color: colors.foreground }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.muted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol
                      name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"}
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Full Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="John Doe"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                  editable={!isLoading}
                  autoCapitalize="words"
                />
              </View>

              {/* Birthday Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Birthday</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted}
                  value={birthday}
                  onChangeText={setBirthday}
                  editable={!isLoading}
                  keyboardType="numeric"
                />
              </View>

              {/* Height and Weight Row */}
              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Height (cm)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        color: colors.foreground,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="170"
                    placeholderTextColor={colors.muted}
                    value={height}
                    onChangeText={setHeight}
                    editable={!isLoading}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Weight (kg)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        color: colors.foreground,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="70"
                    placeholderTextColor={colors.muted}
                    value={weight}
                    onChangeText={setWeight}
                    editable={!isLoading}
                    keyboardType="decimal-pad"
                  />
                </View>
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
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </Pressable>
            </View>

            {/* Sign In Link */}
            <View style={styles.signinContainer}>
              <Text style={[styles.signinText, { color: colors.muted }]}>
                Already have an account?{" "}
              </Text>
              <Pressable onPress={() => router.back()} disabled={isLoading}>
                <Text style={[styles.signinLink, { color: colors.primary }]}>Sign In</Text>
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
    marginBottom: 24,
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
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 8,
  },
  rowContainer: {
    flexDirection: "row",
    gap: 12,
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
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
  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  signinText: {
    fontSize: 14,
  },
  signinLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
