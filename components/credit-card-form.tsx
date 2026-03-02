import { useStripe, CardField } from "@stripe/stripe-react-native";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

interface CreditCardFormProps {
  onPaymentSuccess: (paymentMethodId: string) => Promise<void>;
  onPaymentError: (error: string) => void;
  isProcessing: boolean;
  buttonText?: string;
}

/**
 * Custom credit card form for collecting payment details directly in the app.
 * Uses Stripe's CardField component to securely collect card information.
 */
export function CreditCardForm({
  onPaymentSuccess,
  onPaymentError,
  isProcessing,
  buttonText = "Pay Now",
}: CreditCardFormProps) {
  const colors = useColors();
  const { createPaymentMethod } = useStripe();
  const [cardValid, setCardValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePayment = async () => {
    if (!cardValid) {
      onPaymentError("Please enter a valid card");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a payment method from the card details
      const { paymentMethod, error } = await createPaymentMethod({
        billingDetails: {},
      } as any);

      if (error) {
        console.error("[CreditCardForm] Payment method creation error:", error);
        onPaymentError(error.message || "Failed to process card");
        setIsSubmitting(false);
        return;
      }

      if (!paymentMethod) {
        onPaymentError("Failed to create payment method");
        setIsSubmitting(false);
        return;
      }

      console.log("[CreditCardForm] Payment method created:", paymentMethod.id);

      // Call the success handler with the payment method ID
      // The parent component will use this to confirm the payment on the server
      await onPaymentSuccess(paymentMethod.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      console.error("[CreditCardForm] Payment error:", message);
      onPaymentError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isProcessing || isSubmitting;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Card Input */}
          <View style={styles.cardSection}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Card Details
            </Text>
            <View
              style={[
                styles.cardFieldContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <CardField
                onCardChange={(cardDetails) => {
                  setCardValid(cardDetails.complete);
                }}
                postalCodeEnabled={true}
                placeholders={{
                  number: "4242 4242 4242 4242",
                }}
                style={styles.cardField}
              />
            </View>
          </View>

          {/* Security Notice */}
          <View
            style={[
              styles.securityNotice,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.securityText, { color: colors.muted }]}>
              🔒 Your card details are securely processed by Stripe and never stored on our servers.
            </Text>
          </View>

          {/* Pay Button */}
          <Pressable
            onPress={handlePayment}
            disabled={!cardValid || isLoading}
            style={({ pressed }) => [
              styles.payButton,
              {
                backgroundColor: cardValid && !isLoading ? colors.primary : colors.border,
                opacity: pressed && cardValid && !isLoading ? 0.8 : 1,
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
    </KeyboardAvoidingView>
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
  cardSection: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardFieldContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
  },
  cardField: {
    height: 50,
  },
  securityNotice: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  securityText: {
    fontSize: 12,
    lineHeight: 18,
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
