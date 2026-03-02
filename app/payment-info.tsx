import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { createSubscriptionIntent, confirmPaymentWithCard } from "@/lib/_core/stripe-payment";
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
  const { loading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initKey, setInitKey] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const selectedPlan = PLANS.find((p) => p.id === planId);

  useEffect(() => {
    if (!selectedPlan) return;
    if (authLoading) return;
    let cancelled = false;

    const initPayment = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setPaymentReady(false);
        setClientSecret(null);

        const result = await createSubscriptionIntent(selectedPlan.id);
        if (cancelled) return;

        if (result.upgraded) {
          await subscribe(selectedPlan.id as PlanType);
          router.replace("/payment-success");
          return;
        }

        if (!result.clientSecret) {
          await subscribe(selectedPlan.id as PlanType);
          router.replace("/payment-success");
          return;
        }

        setClientSecret(result.clientSecret);
        if (result.trialEnd) {
          setTrialEndDate(new Date(result.trialEnd * 1000));
        }
        setPaymentReady(true);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[PaymentInfo] initPayment error:", msg);
        // Convert technical errors to user-friendly messages
        let userMessage = msg;
        if (msg.includes("Authentication required") || msg.includes("401") || msg.includes("unauthorized")) {
          userMessage = "Your session has expired. Please log in again.";
        } else if (msg.includes("network") || msg.includes("fetch")) {
          userMessage = "Network error. Please check your connection and try again.";
        }
        setLoadError(userMessage || "Failed to initialize payment");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initPayment();
    return () => {
      cancelled = true;
    };
  }, [selectedPlan?.id, initKey, authLoading]);

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

  // Show loading state
  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Preparing payment...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Show error state
  if (loadError) {
    const isAuthError = loadError.includes("session has expired") || loadError.includes("log in again");
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Start Your Free Trial</Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
            >
              <IconSymbol name="chevron.right" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <View style={[styles.errorBanner, { backgroundColor: colors.error + "18", borderColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{loadError}</Text>
          </View>

          <View style={styles.buttonContainer}>
            {isAuthError && (
              <Pressable
                onPress={() => router.replace("/login-screen")}
                style={({ pressed }) => [
                  styles.retryButton,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.retryButtonText, { color: colors.background }]}>Log In Again</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setInitKey((k) => k + 1)}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
                isAuthError && { marginTop: 12 },
              ]}
            >
              <Text style={[styles.retryButtonText, { color: colors.background }]}>Try Again</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Show payment form
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
            <Text style={[styles.planCardLabel, { color: colors.muted }]}>SELECTED PLAN</Text>
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
                ? `Your card will not be charged until ${formatTrialEnd(trialEndDate)}. Cancel anytime.`
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

        {/* Payment Form */}
        {paymentReady && (
          <View style={styles.formSection}>
            <CreditCardForm
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              isProcessing={isProcessing}
              buttonText="Complete Payment"
            />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

  const styles = StyleSheet.create({
    buttonContainer: {
      marginHorizontal: 16,
      marginBottom: 32,
      gap: 12,
    },
    centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    flex: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  planCardLeft: {
    flex: 1,
  },
  planCardLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
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
    fontSize: 14,
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  trialBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  trialBannerDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 16,
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
    flexShrink: 0,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  formSection: {
    marginHorizontal: 16,
    marginBottom: 32,
    flex: 1,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  backButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
