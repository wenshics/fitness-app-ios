/**
 * Web stub for useStripePaymentSheet.
 * Stripe React Native SDK is not available on web.
 * The real implementation lives in use-stripe-payment-sheet.native.ts.
 */

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
  const initPaymentSheet = async (): Promise<{ error?: string }> => {
    return { error: "Stripe payments are not available on web" };
  };

  const presentPaymentSheet = async (): Promise<PaymentSheetResult> => {
    return { success: false, canceled: false, message: "Stripe payments are not available on web" };
  };

  return { initPaymentSheet, presentPaymentSheet };
}
