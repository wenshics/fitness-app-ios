import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/_core/supabase";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const colors = useColors();

  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Listen for auth state — when user verifies via link, onAuthStateChange fires
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        router.replace("/(tabs)");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  async function handleResend() {
    if (resendCooldown > 0 || !email) return;
    setResending(true);
    setError("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: "manus20260212000221://verify-callback" },
      });
      if (resendError) {
        setError("Failed to resend. Please try again.");
      } else {
        setResendSuccess(true);
        setResendCooldown(60);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  const styles = StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
    icon: { fontSize: 56, textAlign: "center", marginBottom: 24 },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      color: colors.muted,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 8,
    },
    emailText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 32,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 16,
    },
    successText: {
      color: colors.primary,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 16,
    },
    resendRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
      marginBottom: 24,
    },
    resendText: { color: colors.muted, fontSize: 14 },
    resendLink: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    resendDisabled: { color: colors.muted },
    backLink: { alignItems: "center" },
    backLinkText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  });

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to:
        </Text>
        <Text style={styles.emailText}>{email}</Text>
        <Text style={styles.subtitle}>
          Click the link in the email to verify your account. Once verified, you'll be signed in automatically.
          {"\n\n"}
          If you don't see it, check your Spam or Promotions folder.
        </Text>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {resendSuccess && <Text style={styles.successText}>Verification email resent!</Text>}

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive it?</Text>
          <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0 || resending}>
            <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendDisabled]}>
              {resending
                ? " Sending..."
                : resendCooldown > 0
                ? ` Resend in ${resendCooldown}s`
                : " Resend email"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backLink} onPress={() => router.replace("/login-screen")}>
          <Text style={styles.backLinkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
