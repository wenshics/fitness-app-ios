/**
 * Native-only Stripe payment integration.
 * Uses @stripe/stripe-react-native for PCI-compliant Payment Sheet.
 * This file is only bundled on iOS/Android by Metro's platform resolution.
 */
import { initStripe } from "@stripe/stripe-react-native";
import { apiCall } from "@/lib/_core/api";

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

/**
 * Initialize the Stripe SDK.
 * Called once at app startup from app/_layout.tsx.
 */
export async function initializeStripe(): Promise<void> {
  if (!PUBLISHABLE_KEY) {
    console.warn("[Stripe] EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set — payment sheet will not work");
    return;
  }
  await initStripe({
    publishableKey: PUBLISHABLE_KEY,
    merchantIdentifier: "merchant.space.manus.fitness.app.ios",
    urlScheme: "manus20260212000221",
  });
  console.log("[Stripe] SDK initialized with key:", PUBLISHABLE_KEY.slice(0, 20) + "...");
}

/**
 * Create a Stripe Subscription on the server and return the PaymentIntent client_secret.
 */
export async function createSubscriptionIntent(planId: string): Promise<{
  clientSecret: string | null;
  subscriptionId: string;
  trialEnd: number;
  planId: string;
  upgraded?: boolean;
}> {
  const result = await apiCall<{
    success: boolean;
    clientSecret: string | null;
    subscriptionId: string;
    trialEnd: number;
    planId: string;
    upgraded?: boolean;
    error?: string;
  }>("/api/payments/create-subscription", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });

  if (!result.success && !result.upgraded) {
    throw new Error(result.error ?? "Failed to create subscription");
  }

  return {
    clientSecret: result.clientSecret,
    subscriptionId: result.subscriptionId,
    trialEnd: result.trialEnd,
    planId: result.planId,
    upgraded: result.upgraded,
  };
}

/**
 * Get the current subscription status from the server.
 */
export async function getSubscriptionStatus(): Promise<{
  hasSubscription: boolean;
  status?: string;
  planId?: string;
  trialEnd?: number;
  currentPeriodEnd?: number;
}> {
  try {
    return await apiCall<{
      hasSubscription: boolean;
      status?: string;
      planId?: string;
      trialEnd?: number;
      currentPeriodEnd?: number;
    }>("/api/payments/subscription-status", { method: "GET" });
  } catch {
    return { hasSubscription: false };
  }
}

/**
 * Cancel the current subscription (at period end).
 */
export async function cancelSubscription(): Promise<void> {
  await apiCall<{ success: boolean; message: string }>("/api/payments/cancel-subscription", {
    method: "POST",
  });
}

/**
 * Confirm a payment with a card payment method.
 * Sends the payment method ID to the server to complete the payment.
 */
export async function confirmPaymentWithCard(
  clientSecret: string,
  paymentMethodId: string,
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const result = await apiCall<{
      success: boolean;
      message?: string;
      error?: string;
    }>("/api/payments/confirm-payment", {
      method: "POST",
      body: JSON.stringify({
        clientSecret,
        paymentMethodId,
      }),
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error ?? result.message ?? "Payment confirmation failed",
      };
    }

    return {
      success: true,
      message: "Payment successful",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment confirmation failed";
    return {
      success: false,
      message,
    };
  }
}

/**
 * Validate card number using Luhn algorithm.
 */
export function validateCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}
