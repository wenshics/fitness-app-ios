import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { createSubscriptionIntent } from "@/lib/_core/stripe-payment";
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
import { useStripePaymentSheet } from "@/hooks/use-stripe-payment-sheet";

export default function PaymentInfoScreen() {
  const colors = useColors();
  const router = useRouter();
  const { plan: planId } = useLocalSearchParams<{ plan: PlanType }>();
  const { subscribe } = useSubscription();
  const { initPaymentSheet, presentPaymentSheet } = useStripePaymentSheet();
  // Wait for auth to hydrate before making API calls — prevents 401 on first mount
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initKey, setInitKey] = useState(0); // increment to retry

  const selectedPlan = PLANS.find((p) => p.id === planId);

  // Initialise the Payment Sheet when the screen mounts (or on retry)
  // Wait for auth to finish loading so the session token is available in SecureStore
  useEffect(() => {
    if (!selectedPlan) return;
    // Don't fire until auth hydration is complete
    if (authLoading) return;
    let cancelled = false;

    const initSheet = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setPaymentReady(false);

        // 1. Create a Stripe Subscription on the server → get client_secret
        const { clientSecret, trialEnd, upgraded } = await createSubscriptionIntent(selectedPlan.id);

        if (cancelled) return;

        // If the plan was upgraded without needing a new payment method, navigate directly
        if (upgraded) {
          await subscribe(selectedPlan.id as PlanType);
          router.replace("/payment-success");
          return;
        }

        if (!clientSecret) {
          // Subscription created with trial — no payment required yet
          await subscribe(selectedPlan.id as PlanType);
          router.replace("/payment-success");
          return;
        }

        // 2. Initialise the Stripe Payment Sheet with the client_secret
        const { error: initError } = await initPaymentSheet(clientSecret, {
          primary: colors.primary,
          background: colors.background,
          surface: colors.surface,
          border: colors.border,
          foreground: colors.foreground,
          muted: colors.muted,
        });

        if (cancelled) return;

        if (initError) {
          setLoadError(initError);
          return;
        }

        if (trialEnd) {
          setTrialEndDate(new Date(trialEnd * 1000));
        }
        setPaymentReady(true);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to initialise payment";
        setLoadError(message);
        console.error("[PaymentInfo] initSheet error:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initSheet();
    return () => {
      cancelled = true;
    };
  }, [selectedPlan?.id, initKey, authLoading]);

  // Redirect to login if not authenticated (should not happen in normal flow)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.warn("[PaymentInfo] User not authenticated, redirecting to login");
      router.replace("/login-screen");
    }
  }, [authLoading, isAuthenticated]);

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

  const handleStartTrial = async () => {
    if (!paymentReady) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsProcessing(true);
    try {
      // Present the Stripe Payment Sheet — Stripe handles card collection securely
      const result = await presentPaymentSheet();

      if (!result.success) {
        if (result.canceled) {
          // User dismissed the sheet — not an error
          return;
        }
        // Payment failed
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
      console.error("[PaymentInfo] presentPaymentSheet error:", err);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
            "Enter your payment details securely via Stripe",
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

        <View style={{ flex: 1 }} />

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Preparing secure checkout…</Text>
          </View>
        )}

        {/* Error state — shown instead of CTA when init fails */}
        {loadError && !isLoading ? (
          <View style={styles.errorBlock}>
            <View style={[styles.errorBanner, { backgroundColor: colors.error + "18", borderColor: colors.error + "40" }]}>
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{loadError}</Text>
            </View>
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
        ) : (
          <>
            {/* CTA Button */}
            <Pressable
              onPress={handleStartTrial}
              disabled={!paymentReady || isProcessing || isLoading}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: colors.primary },
                (!paymentReady || isLoading) && { opacity: 0.5 },
                pressed && paymentReady && { transform: [{ scale: 0.97 }], opacity: 0.9 },
              ]}
            >
              {isProcessing ? (
                <View style={styles.ctaLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.ctaButtonText}>Processing…</Text>
                </View>
              ) : (
                <Text style={styles.ctaButtonText}>
                  {isLoading ? "Loading…" : "Start Free Trial"}
                </Text>
              )}
            </Pressable>

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
        )}

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
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 8,
  },
  planCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  planCardLeft: {
    flex: 1,
  },
  planCardRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  planCardLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planCardName: {
    fontSize: 18,
    fontWeight: "700",
  },
  planCardPrice: {
    fontSize: 20,
    fontWeight: "700",
  },
  planCardInterval: {
    fontSize: 13,
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  trialBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  trialBannerDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorBlock: {
    marginBottom: 4,
  },
  errorBanner: {
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ctaButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ctaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  cancelButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: "center",
  },
  securityText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    textAlign: "center",
  },
});
