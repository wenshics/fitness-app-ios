import { useState, useRef, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getApiBaseUrl } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const colors = useColors();

  const { login } = useAuth();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const fullCode = code.join("");

  function handleDigitChange(text: string, index: number) {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError("");

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (digit && index === 5) {
      const complete = [...newCode];
      if (complete.every((d) => d !== "")) {
        handleVerify(complete.join(""));
      }
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(codeToVerify = fullCode) {
    if (codeToVerify.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/api/auth/verify-email`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeToVerify }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid or expired code");
        // Clear code on error
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      // Verification successful — log user in with the returned session token
      if (data.sessionToken && data.user) {
        await login(data.user, data.sessionToken);
      }
      // Navigate to home — user is now authenticated
      router.replace("/(tabs)");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResending(true);
    setError("");
    try {
      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/api/auth/send-verification`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResendCooldown(60);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError("Failed to resend code. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
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
      marginBottom: 8,
      lineHeight: 22,
    },
    emailText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 32,
    },
    codeRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      marginBottom: 24,
    },
    digitBox: {
      width: 48,
      height: 58,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    digitBoxFocused: {
      borderColor: colors.primary,
    },
    digitBoxFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.background,
    },
    digitText: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.foreground,
      textAlign: "center",
    },
    digitInput: {
      position: "absolute",
      width: "100%",
      height: "100%",
      opacity: 0,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 16,
    },
    verifyButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 20,
    },
    verifyButtonDisabled: {
      opacity: 0.5,
    },
    verifyButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    resendRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
    },
    resendText: { color: colors.muted, fontSize: 14 },
    resendLink: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    resendDisabled: { color: colors.muted },
  });

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit verification code to:
            </Text>
            <Text style={styles.emailText}>{email}</Text>

            {/* 6-digit code input */}
            <View style={styles.codeRow}>
              {code.map((digit, i) => (
                <View
                  key={i}
                  style={[
                    styles.digitBox,
                    digit ? styles.digitBoxFilled : null,
                  ]}
                >
                  <Text style={styles.digitText}>{digit}</Text>
                  <TextInput
                    ref={(ref) => { inputRefs.current[i] = ref; }}
                    style={styles.digitInput}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(t) => handleDigitChange(t, i)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                    returnKeyType="done"
                    autoFocus={i === 0}
                    selectTextOnFocus
                  />
                </View>
              ))}
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (loading || fullCode.length < 6) && styles.verifyButtonDisabled,
              ]}
              onPress={() => handleVerify()}
              disabled={loading || fullCode.length < 6}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Email</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive it?</Text>
              <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0 || resending}>
                <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
                  {resending
                    ? " Sending..."
                    : resendCooldown > 0
                    ? ` Resend in ${resendCooldown}s`
                    : " Resend code"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
