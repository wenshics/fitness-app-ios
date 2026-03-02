import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { createSubscriptionIntent } from "@/lib/_core/stripe-payment";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

export default function PaymentConfirmationScreen() {
  const colors = useColors();
  const router = useRouter();
  const { plan: planId, cardLast4, cardName, expiry, from } = useLocalSearchParams<{
    plan: PlanType;
    cardLast4: string;
    cardName: string;
    expiry: string;
    from?: string;
  }>();
  const { subscribe } = useSubscription();

  const selectedPlan = PLANS.find((p) => p.id === planId);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!selectedPlan) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Invalid plan selected
          </Text>
          <Pressable onPress={() => router.back()} style={styles.button}>
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Create subscription intent
      const result = await createSubscriptionIntent(planId);

      if (!result || !result.subscriptionId) {
        Alert.alert("Payment Failed", "Failed to process payment");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setIsProcessing(false);
        return;
      }

      // Subscribe locally
      await subscribe(planId);

      // Navigate to success screen
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.replace({
        pathname: "/payment-success",
        params: {
          plan: planId,
          transactionId: result?.subscriptionId || "",
          from,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process payment";
      Alert.alert("Payment Error", message);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} disabled={isProcessing}>
              <Text
                style={[
                  styles.backButton,
                  { color: isProcessing ? colors.muted : colors.primary },
                ]}
              >
                ← Back
              </Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Confirm Order
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Plan Details Card */}
          <View
            style={[
              styles.detailsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Plan Details
            </Text>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Plan</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {selectedPlan.label}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>
                Price
              </Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {selectedPlan.price}{selectedPlan.period}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>
                Free Trial
              </Text>
              <Text style={[styles.detailValue, { color: colors.success }]}>
                7 days
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>
                After Trial
              </Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                Renews automatically
              </Text>
            </View>
          </View>

          {/* Payment Method Card */}
          <View
            style={[
              styles.detailsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Payment Method
            </Text>

            <View style={styles.cardDisplay}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary }]}>
                <IconSymbol name="creditcard.fill" size={24} color={colors.background} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.foreground }]}>
                  {cardName}
                </Text>
                <Text style={[styles.cardNumber, { color: colors.muted }]}>
                  •••• •••• •••• {cardLast4}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.back()}
              disabled={isProcessing}
              style={({ pressed }) => [
                styles.changeButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.changeButtonText, { color: colors.primary }]}>
                Change Card
              </Text>
            </Pressable>
          </View>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: colors.muted }]}>
              By confirming, you agree to the{" "}
              <Text style={{ fontWeight: "600" }}>Terms of Service</Text> and{" "}
              <Text style={{ fontWeight: "600" }}>Privacy Policy</Text>. Your subscription
              will renew automatically after the trial period.
            </Text>
          </View>

          {/* Confirm Button */}
          <Pressable
            onPress={handleConfirmPayment}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.confirmButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
              isProcessing && { opacity: 0.6 },
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={[styles.confirmButtonText, { color: colors.background }]}>
                Confirm & Subscribe
              </Text>
            )}
          </Pressable>

          {/* Cancel Button */}
          <Pressable
            onPress={() => router.back()}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.primary }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  detailsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  cardDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 13,
  },
  changeButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  termsContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
