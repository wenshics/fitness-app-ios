import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
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
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

export default function PaymentInfoScreen() {
  const colors = useColors();
  const router = useRouter();
  const { plan: planId } = useLocalSearchParams<{ plan: PlanType }>();
  const { subscribe } = useSubscription();

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === planId);

  if (!selectedPlan) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>Invalid plan selected</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    const formatted = cleaned.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 2) {
      const formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
      setExpiryMonth(cleaned.slice(0, 2));
      setExpiryYear(cleaned.slice(2, 4));
    }
  };

  const handleConfirm = async () => {
    // Validate inputs
    if (!cardNumber.replace(/\s/g, "") || cardNumber.replace(/\s/g, "").length !== 16) {
      Alert.alert("Invalid Card", "Please enter a valid 16-digit card number");
      return;
    }
    if (!cardName.trim()) {
      Alert.alert("Invalid Name", "Please enter the cardholder name");
      return;
    }
    if (!expiryMonth || !expiryYear || expiryMonth.length !== 2 || expiryYear.length !== 2) {
      Alert.alert("Invalid Expiry", "Please enter a valid expiry date (MM/YY)");
      return;
    }
    if (!cvv || cvv.length < 3 || cvv.length > 4) {
      Alert.alert("Invalid CVV", "Please enter a valid CVV (3-4 digits)");
      return;
    }

    setIsProcessing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Simulate payment processing (in production, this would call a payment API)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Subscribe to the selected plan
      await subscribe(planId);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Navigate to home
      router.replace("/(tabs)");
    } catch (err) {
      console.error("[PaymentInfo] Error:", err);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Payment Failed", "There was an error processing your payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Payment Information</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Plan Summary */}
        <View style={[styles.planSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.planSummaryLeft}>
            <Text style={[styles.planSummaryLabel, { color: colors.muted }]}>You're subscribing to</Text>
            <Text style={[styles.planSummaryName, { color: colors.foreground }]}>{selectedPlan.label}</Text>
          </View>
          <View style={styles.planSummaryRight}>
            <Text style={[styles.planSummaryPrice, { color: colors.foreground }]}>
              {selectedPlan.price}
              <Text style={{ fontSize: 13, color: colors.muted }}>{selectedPlan.period}</Text>
            </Text>
            <Text style={[styles.planSummaryPerWeek, { color: colors.muted }]}>{selectedPlan.perWeek}</Text>
          </View>
        </View>

        {/* Trial Info */}
        <View style={[styles.trialInfo, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.trialTitle, { color: colors.primary }]}>7-Day Free Trial</Text>
            <Text style={[styles.trialDesc, { color: colors.muted }]}>
              Your free trial starts today. You won't be charged until after 7 days.
            </Text>
          </View>
        </View>

        {/* Payment Form */}
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.foreground }]}>Cardholder Name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            placeholder="John Doe"
            placeholderTextColor={colors.muted}
            value={cardName}
            onChangeText={setCardName}
            editable={!isProcessing}
          />

          <Text style={[styles.formLabel, { color: colors.foreground, marginTop: 16 }]}>Card Number</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={colors.muted}
            value={cardNumber}
            onChangeText={formatCardNumber}
            keyboardType="numeric"
            maxLength={19}
            editable={!isProcessing}
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Expiry (MM/YY)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="12/25"
                placeholderTextColor={colors.muted}
                value={`${expiryMonth}${expiryMonth && expiryYear ? "/" : ""}${expiryYear}`}
                onChangeText={formatExpiry}
                keyboardType="numeric"
                maxLength={5}
                editable={!isProcessing}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>CVV</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="123"
                placeholderTextColor={colors.muted}
                value={cvv}
                onChangeText={(text) => setCvv(text.replace(/\D/g, "").slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                editable={!isProcessing}
              />
            </View>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <IconSymbol name="lock.fill" size={16} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.muted }]}>
            Your payment information is encrypted and secure
          </Text>
        </View>

        {/* Confirm Button */}
        <Pressable
          onPress={handleConfirm}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.confirmButton,
            { backgroundColor: colors.primary },
            (pressed || isProcessing) && { opacity: 0.7 },
          ]}
        >
          {isProcessing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>Start Free Trial</Text>
          )}
        </Pressable>

        {/* Terms */}
        <Text style={[styles.termsText, { color: colors.muted }]}>
          By confirming, you agree to our Terms of Service and Privacy Policy. Your subscription will automatically renew after the free trial ends.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  planSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  planSummaryLeft: {
    flex: 1,
  },
  planSummaryRight: {
    alignItems: "flex-end",
  },
  planSummaryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  planSummaryName: {
    fontSize: 18,
    fontWeight: "700",
  },
  planSummaryPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  planSummaryPerWeek: {
    fontSize: 12,
    marginTop: 2,
  },
  trialInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  trialDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  rowInputs: {
    flexDirection: "row",
    marginTop: 16,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  securityText: {
    fontSize: 12,
  },
  confirmButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
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
});
