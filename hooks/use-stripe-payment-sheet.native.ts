/**
 * Native-only Stripe Payment Sheet hook.
 * Uses @stripe/stripe-react-native for PCI-compliant card collection.
 * This file is only bundled on iOS/Android by Metro's platform resolution.
 */
import { useStripe, PaymentSheetError } from "@stripe/stripe-react-native";

export type PaymentSheetResult =
  | { success: true }
  | { success: false; canceled: true }
  | { success: false; canceled: false; message: string };

export interface UseStripePaymentSheetReturn {
  initPaymentSheet: (clientSecret: string, colors: {
    primary: string;
    background: string;
    surface: string;
    border: string;
    foreground: string;
    muted: string;
  }) => Promise<{ error?: string }>;
  presentPaymentSheet: () => Promise<PaymentSheetResult>;
}

export function useStripePaymentSheet(): UseStripePaymentSheetReturn {
  const { initPaymentSheet: stripeInit, presentPaymentSheet: stripePresent } = useStripe();

  const initPaymentSheet = async (
    clientSecret: string,
    colors: {
      primary: string;
      background: string;
      surface: string;
      border: string;
      foreground: string;
      muted: string;
    }
  ): Promise<{ error?: string }> => {
    const { error } = await stripeInit({
      paymentIntentClientSecret: clientSecret,
      returnURL: "manus20260212000221://stripe-redirect",
      merchantDisplayName: "Pulse",
      allowsDelayedPaymentMethods: false,
      appearance: {
        colors: {
          primary: colors.primary,
          background: colors.background,
          componentBackground: colors.surface,
          componentBorder: colors.border,
          componentDivider: colors.border,
          primaryText: colors.foreground,
          secondaryText: colors.muted,
          componentText: colors.foreground,
          placeholderText: colors.muted,
        },
      },
    });
    return error ? { error: error.message } : {};
  };

  const presentPaymentSheet = async (): Promise<PaymentSheetResult> => {
    const { error } = await stripePresent();
    if (!error) return { success: true };
    if (error.code === PaymentSheetError.Canceled) return { success: false, canceled: true };
    return { success: false, canceled: false, message: error.message };
  };

  return { initPaymentSheet, presentPaymentSheet };
}
