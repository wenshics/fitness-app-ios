import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

export default function PaymentSuccessScreen() {
  const colors = useColors();
  const router = useRouter();
  const { plan: planId, transactionId } = useLocalSearchParams<{
    plan: PlanType;
    transactionId: string;
  }>();
  const { subscription, getCurrentPlan } = useSubscription();
  const [isNavigating, setIsNavigating] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === planId);

  useEffect(() => {
    if (selectedPlan) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [selectedPlan]);

  const handleConfirm = async () => {
    setIsNavigating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate back twice: first from payment-success to payment-info, then from payment-info to previous screen
    router.back();
    router.back();
  };

  if (!selectedPlan) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Invalid plan
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

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Success Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.success + "20" }]}>
          <IconSymbol
            name="checkmark.circle.fill"
            size={80}
            color={colors.success}
          />
        </View>

        {/* Success Message */}
        <Text style={[styles.title, { color: colors.foreground }]}>
          Payment Successful!
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Your subscription is now active
        </Text>

        {/* Plan Details */}
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>
              Plan
            </Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {selectedPlan.label}
            </Text>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.border },
            ]}
          />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>
              Price
            </Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {selectedPlan.price}
            </Text>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.border },
            ]}
          />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>
              Billing Cycle
            </Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {selectedPlan.period}
            </Text>
          </View>

          {transactionId && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>
                  Transaction ID
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {transactionId}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, { color: colors.foreground }]}>
            You now have access to:
          </Text>

          {[
            "Unlimited daily exercise plans",
            "All 30+ exercises with demos",
            "Workout reminders",
            "Progress tracking & awards",
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <IconSymbol
                name="checkmark.circle.fill"
                size={20}
                color={colors.success}
              />
              <Text style={[styles.featureText, { color: colors.foreground }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Confirm Button */}
        <Pressable
          onPress={handleConfirm}
          disabled={isNavigating}
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
            isNavigating && { opacity: 0.6 },
          ]}
        >
          {isNavigating ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={[styles.continueButtonText, { color: colors.background }]}>
              Confirm
            </Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  detailsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
  },
  divider: {
    height: 1,
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
  featuresContainer: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
