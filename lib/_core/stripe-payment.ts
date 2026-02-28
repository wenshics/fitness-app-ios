/**
 * Simple payment processing without Stripe React Native
 * This uses a server-side payment API for processing
 */

import { getApiBaseUrl } from "@/constants/oauth";

/**
 * Initialize payment system (no-op since we use server-side processing)
 */
export async function initializeStripe() {
  console.log("[Payment] Initialized");
  return;
}

/**
 * Process subscription payment via server
 * This sends the payment details to your backend for processing
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
    const apiUrl = getApiBaseUrl();
    const endpoint = apiUrl ? `${apiUrl}/api/payments/subscribe` : "/api/payments/subscribe";
    const response = await fetch(endpoint, {
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
    console.log("[Payment] Payment processed successfully:", result);
    return result;
  } catch (error) {
    console.error("[Payment] Payment processing error:", error);
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
