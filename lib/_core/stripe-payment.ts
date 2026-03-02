/**
 * Stripe payment integration using @stripe/stripe-react-native.
 *
 * Architecture:
 *  - StripeProvider wraps the app in app/_layout.tsx
 *  - createSubscriptionIntent() creates a Stripe Subscription on the server
 *    and returns the PaymentIntent client_secret for the Payment Sheet
 *  - The Payment Sheet collects and tokenises card data natively (PCI-compliant)
 *  - On success, the subscription is activated in Stripe
 */
import { apiCall } from "@/lib/_core/api";

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

/**
 * Initialize the Stripe SDK.
 * Called once at app startup from app/_layout.tsx.
 */
/**
 * Web stub — Stripe React Native SDK is not available on web.
 * The real implementation lives in stripe-payment.native.ts.
 */
export async function initializeStripe(): Promise<void> {
  console.log("[Stripe] Web environment — Stripe React Native SDK not loaded");
}

/**
 * Create a Stripe Subscription on the server and return the PaymentIntent client_secret.
 * The client_secret is used to present the Payment Sheet.
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
 * Confirm a payment with a card payment method (web stub).
 */
export async function confirmPaymentWithCard(
  clientSecret: string,
  paymentMethodId: string,
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
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
}

/**
 * Validate card number using Luhn algorithm (kept for any local validation needs).
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
