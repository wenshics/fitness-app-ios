import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

interface CreditCardFormProps {
  onPaymentSuccess: (paymentMethodId: string) => Promise<void>;
  onPaymentError: (error: string) => void;
  isProcessing: boolean;
  buttonText?: string;
}

/**
 * Web stub for CreditCardForm.
 * On web, we show a message that payment is not available.
 * The real implementation is in credit-card-form.native.tsx for iOS/Android.
 */
export function CreditCardForm({
  onPaymentSuccess,
  onPaymentError,
  isProcessing,
  buttonText = "Pay Now",
}: CreditCardFormProps) {
  const colors = useColors();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePayment = async () => {
    setIsSubmitting(true);
    try {
      // On web, we can't use the native Stripe CardField
      // In a real app, you'd use Stripe.js Elements or Stripe Payment Element
      Alert.alert(
        "Payment Not Available on Web",
        "Please use the mobile app (iOS/Android) to complete your payment.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isProcessing || isSubmitting;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        {/* Info Message */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            💳 Payment Collection
          </Text>
          <Text style={[styles.infoDescription, { color: colors.muted }]}>
            To enter your payment details securely, please use the mobile app on iOS or Android.
          </Text>
        </View>

        {/* Placeholder Button */}
        <Pressable
          onPress={handlePayment}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.payButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={[styles.payButtonText, { color: colors.background }]}>
              {buttonText}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  container: {
    paddingHorizontal: 16,
    gap: 24,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  payButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
