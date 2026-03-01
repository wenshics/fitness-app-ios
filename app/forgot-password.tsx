import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getApiBaseUrl } from "@/constants/oauth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useColors();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send reset email");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: "center" },
    inner: { paddingHorizontal: 24, paddingVertical: 32 },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.muted,
      lineHeight: 22,
      marginBottom: 32,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 20,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginBottom: 12,
    },
    sendButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 20,
    },
    sendButtonDisabled: { opacity: 0.5 },
    sendButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    backLink: { alignItems: "center" },
    backLinkText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    // Success state
    successIcon: {
      fontSize: 56,
      textAlign: "center",
      marginBottom: 24,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 12,
    },
    successText: {
      fontSize: 15,
      color: colors.muted,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 32,
    },
    successEmail: {
      fontWeight: "600",
      color: colors.foreground,
    },
    doneButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    doneButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });

  if (sent) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: 24 }]}>
          <Text style={styles.successIcon}>📧</Text>
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successText}>
            We sent a password reset link to{" "}
            <Text style={styles.successEmail}>{email.trim()}</Text>.
            {"\n\n"}
            Click the link in the email to reset your password. The link expires in 1 hour.
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.replace("/login-screen")}
          >
            <Text style={styles.doneButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              onSubmitEditing={handleSend}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
