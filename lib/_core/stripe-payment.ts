import { Platform } from "react-native";
import type { PaymentMethod } from "@stripe/stripe-react-native";

// Only import Stripe on native platforms (not web)
let initStripe: any = null;
let createPaymentMethod: any = null;

if (Platform.OS !== "web") {
  try {
    const stripeModule = require("@stripe/stripe-react-native");
    initStripe = stripeModule.initStripe;
    createPaymentMethod = stripeModule.createPaymentMethod;
  } catch (error) {
    console.warn("[Stripe] Failed to load native module:", error);
  }
}

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

/**
 * Initialize Stripe with the publishable key
 */
export async function initializeStripe() {
  // Skip on web platform
  if (Platform.OS === "web") {
    console.log("[Stripe] Skipped on web platform");
    return;
  }

  // Skip initialization if key is not configured (optional feature)
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn("[Stripe] Publishable key not configured, skipping initialization");
    return;
  }

  if (!initStripe) {
    console.warn("[Stripe] Native module not available");
    return;
  }

  try {
    await initStripe({
      publishableKey: STRIPE_PUBLISHABLE_KEY,
      merchantIdentifier: "merchant.com.fitlife",
    });
    console.log("[Stripe] Initialized successfully");
  } catch (error) {
    console.error("[Stripe] Initialization failed:", error);
    // Don't throw - allow app to continue even if Stripe fails
  }
}

/**
 * Create a payment method from card details using Stripe's CardField
 * Note: In production, use CardField component for PCI compliance
 * This is a simplified version for testing
 */
export async function createPaymentMethodFromCard(
  cardNumber: string,
  expiryMonth: number,
  expiryYear: number,
  cvc: string
) {
  if (!createPaymentMethod) {
    throw new Error("Stripe not available on this platform");
  }

  try {
    // For production, you should use CardField component which handles PCI compliance
    // This is a simplified approach for testing
    const { paymentMethod, error } = await createPaymentMethod({
      paymentMethodType: "Card",
      paymentMethodData: {
        token: cardNumber, // In production, use actual token from CardField
        billingDetails: {
          name: "", // Will be set separately
        },
      },
    });

    if (error) {
      console.error("[Stripe] Payment method creation failed:", error);
      throw new Error(error.message || "Failed to create payment method");
    }

    if (!paymentMethod) {
      throw new Error("Failed to create payment method");
    }

    return paymentMethod;
  } catch (error) {
    console.error("[Stripe] Payment method creation error:", error);
    throw error;
  }
}

/**
 * Process subscription payment via server
 * This sends the payment method to your backend for processing
 */
export async function processSubscriptionPayment(
  planId: string,
  cardNumber: string,
  expiryMonth: number,
  expiryYear: number,
  cvc: string,
  cardholder: string
) {
  try {
    // In production, validate card details on the backend
    // For now, we'll send directly to the server

    // Send to server for processing
    const response = await fetch("/api/payments/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId,
        cardNumber,
        expiryMonth,
        expiryYear,
        cvc,
        cardholder,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Payment processing failed");
    }

    const result = await response.json();
    console.log("[Stripe] Payment processed successfully:", result);
    return result;
  } catch (error) {
    console.error("[Stripe] Payment processing error:", error);
    throw error;
  }
}

/**
 * Validate card number using Luhn algorithm
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
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}
