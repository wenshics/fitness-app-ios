import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
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

export default function PaymentCardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { plan: planId, from } = useLocalSearchParams<{ plan: PlanType; from?: string }>();
  const { getCurrentPlan } = useSubscription();

  const selectedPlan = PLANS.find((p) => p.id === planId);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validateCard = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Card number validation (basic: 13-19 digits)
    if (!cardNumber.replace(/\s/g, "").match(/^\d{13,19}$/)) {
      newErrors.cardNumber = "Invalid card number";
    }

    // Cardholder name
    if (!cardName.trim()) {
      newErrors.cardName = "Cardholder name is required";
    }

    // Expiry validation
    if (!expiry || !expiry.includes("/")) {
      newErrors.expiry = "Expiry date is required (MM/YY)";
    } else {
      const parts = expiry.split("/");
      const month = parseInt(parts[0]);
      const year = parseInt(parts[1]);
      if (month < 1 || month > 12) {
        newErrors.expiry = "Invalid month (01-12)";
      } else {
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;
        
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          newErrors.expiry = "Card has expired";
        }
      }
    }

    // CVC validation
    if (!cvc.match(/^\d{3,4}$/)) {
      newErrors.cvc = "Invalid CVC (3-4 digits)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateCard()) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setIsProcessing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Navigate to payment confirmation with card details
      const cardLast4 = cardNumber.replace(/\s/g, "").slice(-4);
      router.push({
        pathname: "/payment-confirmation",
        params: {
          plan: planId,
          cardLast4,
          cardName,
          expiry,
          from,
        },
      });
    } catch (err) {
      Alert.alert("Error", "Failed to process payment. Please try again.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted.slice(0, 23)); // Max 19 digits + 4 spaces
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length <= 4) {
      if (cleaned.length <= 2) {
        setExpiry(cleaned);
      } else {
        // Auto-format to MM/YY
        const month = cleaned.slice(0, 2);
        const year = cleaned.slice(2, 4);
        setExpiry(`${month}/${year}`);
      }
    }
  };

  const formatCvc = (text: string) => {
    setCvc(text.replace(/\D/g, "").slice(0, 4));
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Payment Details
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Plan Summary */}
          <View
            style={[
              styles.planSummary,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.planRow}>
              <Text style={[styles.planLabel, { color: colors.muted }]}>Plan</Text>
              <Text style={[styles.planValue, { color: colors.foreground }]}>
                {selectedPlan.label}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.planRow}>
              <Text style={[styles.planLabel, { color: colors.muted }]}>Price</Text>
              <Text style={[styles.planValue, { color: colors.foreground }]}>
                {selectedPlan.price}{selectedPlan.period}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.planRow}>
              <Text style={[styles.planLabel, { color: colors.muted }]}>Trial</Text>
              <Text style={[styles.planValue, { color: colors.success }]}>
                7 days free
              </Text>
            </View>
          </View>

          {/* Card Details Form */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Card Information
            </Text>

            {/* Cardholder Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Cardholder Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: errors.cardName ? colors.error : colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="John Doe"
                placeholderTextColor={colors.muted}
                value={cardName}
                onChangeText={setCardName}
                editable={!isProcessing}
              />
              {errors.cardName && (
                <Text style={[styles.error, { color: colors.error }]}>
                  {errors.cardName}
                </Text>
              )}
            </View>

            {/* Card Number */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Card Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: errors.cardNumber ? colors.error : colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="4242 4242 4242 4242"
                placeholderTextColor={colors.muted}
                value={cardNumber}
                onChangeText={formatCardNumber}
                keyboardType="numeric"
                editable={!isProcessing}
              />
              {errors.cardNumber && (
                <Text style={[styles.error, { color: colors.error }]}>
                  {errors.cardNumber}
                </Text>
              )}
            </View>

            {/* Expiry and CVC */}
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Expiry (MM/YY)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: errors.expiry ? colors.error : colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.muted}
                  value={expiry}
                  onChangeText={formatExpiry}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!isProcessing}
                />
                {errors.expiry && (
                  <Text style={[styles.error, { color: colors.error }]}>
                    {errors.expiry}
                  </Text>
                )}
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>CVC</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: errors.cvc ? colors.error : colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  placeholder="123"
                  placeholderTextColor={colors.muted}
                  value={cvc}
                  onChangeText={formatCvc}
                  keyboardType="numeric"
                  maxLength={4}
                  editable={!isProcessing}
                />
                {errors.cvc && (
                  <Text style={[styles.error, { color: colors.error }]}>
                    {errors.cvc}
                  </Text>
                )}
              </View>
            </View>

          </View>

          {/* Continue Button */}
          <Pressable
            onPress={handleContinue}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
              isProcessing && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.continueButtonText, { color: colors.background }]}>
              {isProcessing ? "Processing..." : "Review Order"}
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
  planSummary: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  planValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  expiryInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: "center",
  },
  slash: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
  },
  infoBox: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    marginBottom: 16,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
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
