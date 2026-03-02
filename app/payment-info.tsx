import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { createSubscriptionIntent, confirmPaymentWithCard } from "@/lib/_core/stripe-payment";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";
import { CreditCardForm } from "@/components/credit-card-form";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

export default function PaymentInfoScreen() {
  const colors = useColors();
  const router = useRouter();
  const { plan: planId } = useLocalSearchParams<{ plan: PlanType }>();
  const { subscribe } = useSubscription();
  // Wait for auth to hydrate before making API calls — prevents 401 on first mount
  const { loading: authLoading, isAuthenticated, logout } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initKey, setInitKey] = useState(0); // increment to retry
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const selectedPlan = PLANS.find((p) => p.id === planId);

  // Initialise payment when the screen mounts (or on retry)
  // Wait for auth to finish loading so the session token is available in SecureStore
  useEffect(() => {
    if (!selectedPlan) return;
    // Don't fire until auth hydration is complete
    if (authLoading) return;
    let cancelled = false;

    const initPayment = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setPaymentReady(false);
        setClientSecret(null);

        // 0. Proactively validate the session token before making payment calls
        //    This catches stale tokens early and gives a clear error message
        const sessionToken = await Auth.getSessionToken();
        console.log("[PaymentInfo] Session token present:", !!sessionToken, sessionToken ? `(${sessionToken.length} chars, starts: ${sessionToken.substring(0, 12)}...)` : "MISSING");
        if (!sessionToken) {
          console.error("[PaymentInfo] No session token found in SecureStore");
          setLoadError("SESSION_EXPIRED");
          return;
        }
        // Validate token against server
        const me = await Api.getMe();
        console.log("[PaymentInfo] Token validation result:", me ? `valid (userId: ${me.id})` : "INVALID");
        if (!me) {
          console.error("[PaymentInfo] Token rejected by server — session expired");
          setLoadError("SESSION_EXPIRED");
          return;
        }

        // 1. Create a Stripe Subscription on the server → get client_secret
        let clientSecretValue: string | null;
        let trialEnd: number;
        let upgraded: boolean | undefined;
        try {
          const result = await createSubscriptionIntent(selectedPlan.id);
          clientSecretValue = result.clientSecret;
          trialEnd = result.trialEnd;
          upgraded = result.upgraded;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[PaymentInfo] createSubscriptionIntent error:", msg);
          // Auth error — show a specific error with a Log In Again button instead of auto-redirecting
          const isAuthError =
            msg.toLowerCase().includes("authentication") ||
            msg.toLowerCase().includes("401") ||
            msg.toLowerCase().includes("not authenticated") ||
            msg.toLowerCase().includes("session expired") ||
            msg.toLowerCase().includes("unauthorized");
          if (isAuthError) {
            setLoadError("SESSION_EXPIRED");
            return;
          }
          throw err;
        }

        if (cancelled) return;

        // If the plan was upgraded without needing a new payment method, navigate directly
        if (upgraded) {
          await subscribe(selectedPlan.id as PlanType);
          router.replace("/payment-success");
          return;
        }

        if (!clientSecretValue) {
          // Subscription created with trial — no payment required yet
          await subscribe(selectedPlan.id as PlanType);
          router.replace("/payment-success");
          return;
        }

        // Store the client secret for later use
        setClientSecret(clientSecretValue);

        if (trialEnd) {
          setTrialEndDate(new Date(trialEnd * 1000));
        }
        setPaymentReady(true);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to initialise payment";
        setLoadError(message);
        console.error("[PaymentInfo] initPayment error:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initPayment();
    return () => {
      cancelled = true;
    };
  }, [selectedPlan?.id, initKey, authLoading]);

  // No auto-redirect on auth state — handled by AuthGuard in _layout.tsx

  if (!selectedPlan) {
    return (
      <ScreenContainer>
        <View style={styles.centeredContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>Invalid plan selected</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const handlePaymentSuccess = async (paymentMethodId: string) => {
    if (!clientSecret) {
      Alert.alert("Error", "Payment information is missing. Please try again.");
      return;
    }

    setIsProcessing(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Confirm the payment with the card token
      const result = await confirmPaymentWithCard(clientSecret, paymentMethodId);

      if (!result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert(
          "Payment Failed",
          result.message || "Your payment could not be processed. Please try again.",
          [{ text: "OK" }]
        );
        return;
      }

      // Payment succeeded — activate subscription locally
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await subscribe(selectedPlan.id as PlanType);
      router.replace("/payment-success");
    } catch (err) {
      console.error("[PaymentInfo] Payment error:", err);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    console.error("[PaymentInfo] Payment form error:", error);
    Alert.alert("Payment Error", error);
  };

  const formatTrialEnd = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Start Your Free Trial</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Plan Summary */}
        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.planCardLeft}>
            <Text style={[styles.planCardLabel, { color: colors.muted }]}>Selected Plan</Text>
            <Text style={[styles.planCardName, { color: colors.foreground }]}>{selectedPlan.label}</Text>
          </View>
          <View style={styles.planCardRight}>
            <Text style={[styles.planCardPrice, { color: colors.primary }]}>{selectedPlan.price}</Text>
            <Text style={[styles.planCardInterval, { color: colors.muted }]}>/{selectedPlan.id}</Text>
          </View>
        </View>

        {/* Trial Banner */}
        <View style={[styles.trialBanner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
          <IconSymbol name="paperplane.fill" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.trialBannerTitle, { color: colors.primary }]}>7-Day Free Trial</Text>
            <Text style={[styles.trialBannerDesc, { color: colors.muted }]}>
              {trialEndDate
                ? `Your card will not be charged until ${formatTrialEnd(trialEndDate)}. Cancel anytime before then.`
                : "Your card will not be charged for 7 days. Cancel anytime."}
            </Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How it works</Text>
          {[
            "Enter your payment details securely",
            "Enjoy 7 days of full access — completely free",
            `After your trial, you'll be charged ${selectedPlan.price}${selectedPlan.period}`,
            "Cancel anytime from your profile settings",
          ].map((text, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.stepText, { color: colors.foreground }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Preparing secure checkout…</Text>
          </View>
        )}

        {/* Error state — shown instead of form when init fails */}
        {loadError && !isLoading ? (
          <View style={styles.errorBlock}>
            <View style={[styles.errorBanner, { backgroundColor: colors.error + "18", borderColor: colors.error + "40" }]}>
              <Text style={[styles.errorBannerText, { color: colors.error }]}>
                {loadError === "SESSION_EXPIRED"
                  ? "Your session has expired. Please log in again to continue."
                  : loadError}
              </Text>
            </View>
            {loadError === "SESSION_EXPIRED" ? (
              <Pressable
                onPress={async () => {
                  await logout();
                  router.replace("/login-screen");
                }}
                style={({ pressed }) => [
                  styles.retryButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[styles.retryButtonText, { color: "#FFFFFF" }]}>Log In Again</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setInitKey((k) => k + 1)}
                style={({ pressed }) => [
                  styles.retryButton,
                  { backgroundColor: colors.error, borderColor: colors.error },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[styles.retryButtonText, { color: "#FFFFFF" }]}>Retry</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderColor: colors.border },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : paymentReady && !isLoading ? (
          <>
            {/* Credit Card Form */}
            <View style={styles.formSection}>
              <CreditCardForm
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                isProcessing={isProcessing}
                buttonText="Start Free Trial"
              />
            </View>

            {/* Cancel */}
            <Pressable
              onPress={() => router.back()}
              disabled={isProcessing}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderColor: colors.border },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </>
        ) : null}

        {/* Security note */}
        <View style={styles.securityNote}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={14} color={colors.muted} />
          <Text style={[styles.securityText, { color: colors.muted }]}>
            Payments are processed securely by Stripe. We never store your card details.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
  },
  planCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  planCardLeft: {
    gap: 4,
  },
  planCardLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planCardName: {
    fontSize: 18,
    fontWeight: "600",
  },
  planCardRight: {
    alignItems: "flex-end",
  },
  planCardPrice: {
    fontSize: 24,
    fontWeight: "700",
  },
  planCardInterval: {
    fontSize: 12,
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  trialBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  trialBannerDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
  },
  errorBlock: {
    gap: 12,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  formSection: {
    marginVertical: 20,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
