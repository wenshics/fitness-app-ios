import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { PLANS, type PlanType, useSubscription } from "@/lib/subscription-store";
import { processSubscriptionPayment } from "@/lib/_core/stripe-payment";
import { saveCard, getSavedCards, type SavedCard } from "@/lib/_core/card-storage";
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
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string | null>(null);
  const [showSavedCards, setShowSavedCards] = useState(false);

  const selectedPlan = PLANS.find((p) => p.id === planId);

  // Load saved cards on mount
  useEffect(() => {
    const loadCards = async () => {
      if (Platform.OS !== "web") {
        const cards = await getSavedCards();
        setSavedCards(cards);
      }
    };
    loadCards();
  }, []);

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
    
    // Clear error when user starts typing
    if (errors.cardNumber) {
      setErrors((prev) => ({ ...prev, cardNumber: "" }));
    }
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);
    let formatted = cleaned;
    
    if (cleaned.length >= 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    
    setExpiry(formatted);
    
    // Clear error when user starts typing
    if (errors.expiry) {
      setErrors((prev) => ({ ...prev, expiry: "" }));
    }
  };

  const formatCvv = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);
    setCvv(cleaned);
    
    // Clear error when user starts typing
    if (errors.cvv) {
      setErrors((prev) => ({ ...prev, cvv: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate card number
    const cardNumberClean = cardNumber.replace(/\s/g, "");
    if (!cardNumberClean) {
      newErrors.cardNumber = "Card number is required";
    } else if (cardNumberClean.length !== 16) {
      newErrors.cardNumber = "Card number must be 16 digits";
    } else if (!luhnCheck(cardNumberClean)) {
      newErrors.cardNumber = "Invalid card number";
    }

    // Validate cardholder name
    if (!cardName.trim()) {
      newErrors.cardName = "Cardholder name is required";
    }

    // Validate expiry
    const expiryClean = expiry.replace(/\D/g, "");
    if (!expiryClean) {
      newErrors.expiry = "Expiry date is required";
    } else if (expiryClean.length !== 4) {
      newErrors.expiry = "Expiry must be MM/YY format";
    } else {
      const month = parseInt(expiryClean.slice(0, 2), 10);
      if (month < 1 || month > 12) {
        newErrors.expiry = "Invalid month (01-12)";
      }
    }

    // Validate CVV
    if (!cvv) {
      newErrors.cvv = "CVV is required";
    } else if (cvv.length < 3 || cvv.length > 4) {
      newErrors.cvv = "CVV must be 3-4 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Luhn algorithm for card validation
  const luhnCheck = (num: string) => {
    let sum = 0;
    let isEven = false;

    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) {
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
      // Parse expiry date
      const expiryClean = expiry.replace(/\D/g, "");
      const expiryMonth = parseInt(expiryClean.slice(0, 2), 10);
      const expiryYear = parseInt(expiryClean.slice(2, 4), 10);

      // Process payment
      const cardNumberClean = cardNumber.replace(/\s/g, "");
      console.log("[PaymentInfo] Processing payment for plan:", planId);
      
      const paymentResult = await processSubscriptionPayment(
        planId,
        cardNumberClean,
        expiryMonth,
        expiryYear,
        cvv,
        cardName
      );

      console.log("[PaymentInfo] Payment processed:", paymentResult);

      if (!paymentResult.success) {
        throw new Error(paymentResult.message || "Payment failed");
      }

      // Save card if user opted in
      if (saveCardForFuture && Platform.OS !== "web") {
        try {
          await saveCard(cardNumberClean, expiryMonth, expiryYear, cvv, cardName);
          console.log("[PaymentInfo] Card saved successfully");
        } catch (error) {
          console.warn("[PaymentInfo] Failed to save card:", error);
          // Don't fail the payment if card saving fails
        }
      }

      // Subscribe to the selected plan
      console.log("[PaymentInfo] Subscribing to plan:", planId);
      await subscribe(planId);
      console.log("[PaymentInfo] Subscription successful");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Navigate to success screen
      console.log("[PaymentInfo] Navigating to success screen");
      setIsProcessing(false);
      router.push({
        pathname: "/payment-success",
        params: {
          plan: planId,
          transactionId: paymentResult.transactionId || "",
        },
      });
    } catch (err) {
      console.error("[PaymentInfo] Error:", err);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      const errorMessage = err instanceof Error ? err.message : "There was an error processing your payment. Please try again.";
      Alert.alert("Payment Failed", errorMessage);
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

        {/* Saved Cards Section */}
        {savedCards.length > 0 && (
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>Use Saved Card</Text>
            <Pressable
              onPress={() => setShowSavedCards(!showSavedCards)}
              style={[styles.savedCardsToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.savedCardsToggleText, { color: colors.foreground }]}>
                {selectedSavedCardId ? `•••• ${savedCards.find(c => c.id === selectedSavedCardId)?.lastFour}` : "Select a saved card"}
              </Text>
              <IconSymbol name="chevron.down" size={20} color={colors.muted} />
            </Pressable>
            {showSavedCards && (
              <View style={[styles.savedCardsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => {
                    setSelectedSavedCardId(null);
                    setShowSavedCards(false);
                  }}
                  style={styles.savedCardOption}
                >
                  <Text style={[styles.savedCardOptionText, { color: colors.foreground }]}>Enter New Card</Text>
                </Pressable>
                {savedCards.map((card) => (
                  <Pressable
                    key={card.id}
                    onPress={() => {
                      setSelectedSavedCardId(card.id);
                      setShowSavedCards(false);
                    }}
                    style={styles.savedCardOption}
                  >
                    <View style={styles.savedCardInfo}>
                      <Text style={[styles.savedCardOptionText, { color: colors.foreground }]}>
                        {card.brand.toUpperCase()} •••• {card.lastFour}
                      </Text>
                      <Text style={[styles.savedCardExpiry, { color: colors.muted }]}>
                        {card.expiryMonth}/{card.expiryYear}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Payment Form */}
        {!selectedSavedCardId && (
        <View style={styles.formSection}>
          {/* Cardholder Name */}
          <View>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>Cardholder Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: errors.cardName ? colors.error : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="John Doe"
              placeholderTextColor={colors.muted}
              value={cardName}
              onChangeText={(text) => {
                setCardName(text);
                if (errors.cardName) {
                  setErrors((prev) => ({ ...prev, cardName: "" }));
                }
              }}
              editable={!isProcessing}
            />
            {errors.cardName && <Text style={[styles.errorMessage, { color: colors.error }]}>{errors.cardName}</Text>}
          </View>

          {/* Card Number */}
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.formLabel, { color: colors.foreground }]}>Card Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: errors.cardNumber ? colors.error : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={colors.muted}
              value={cardNumber}
              onChangeText={formatCardNumber}
              keyboardType="numeric"
              maxLength={19}
              editable={!isProcessing}
            />
            {errors.cardNumber && <Text style={[styles.errorMessage, { color: colors.error }]}>{errors.cardNumber}</Text>}
          </View>

          {/* Expiry and CVV */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>Expiry (MM/YY)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: errors.expiry ? colors.error : colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="12/25"
                placeholderTextColor={colors.muted}
                value={expiry}
                onChangeText={formatExpiry}
                keyboardType="numeric"
                maxLength={5}
                editable={!isProcessing}
              />
              {errors.expiry && <Text style={[styles.errorMessage, { color: colors.error }]}>{errors.expiry}</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.formLabel, { color: colors.foreground }]}>CVV</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: errors.cvv ? colors.error : colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="123"
                placeholderTextColor={colors.muted}
                value={cvv}
                onChangeText={formatCvv}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                editable={!isProcessing}
              />
              {errors.cvv && <Text style={[styles.errorMessage, { color: colors.error }]}>{errors.cvv}</Text>}
            </View>
          </View>
        </View>
        )}

        {/* Security Note */}
        <View style={styles.securityNote}>
          <IconSymbol name="lock.fill" size={16} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.muted }]}>
            Your payment information is encrypted and secure
          </Text>
        </View>

        {/* Save Card Checkbox */}
        <Pressable
          onPress={() => setSaveCardForFuture(!saveCardForFuture)}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.checkboxRow,
            pressed && { opacity: 0.6 },
          ]}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: colors.primary,
                backgroundColor: saveCardForFuture ? colors.primary : "transparent",
              },
            ]}
          >
            {saveCardForFuture && (
              <IconSymbol name="checkmark" size={16} color={colors.background} />
            )}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.foreground }]}>
            Save card for future payments
          </Text>
        </Pressable>

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

        {/* Cancel Button */}
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
  errorMessage: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
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
  cancelButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  savedCardsToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  savedCardsToggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  savedCardsList: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  savedCardOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  savedCardInfo: {
    gap: 4,
  },
  savedCardOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  savedCardExpiry: {
    fontSize: 12,
  },
});
