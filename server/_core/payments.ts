import type { Express, Request, Response } from "express";
import Stripe from "stripe";

/**
 * Payment API routes for real Stripe integration
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

interface PaymentRequest {
  planId: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvc: string;
  cardholder: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId: string;
  planId: string;
  message: string;
  clientSecret?: string;
}

// Plan pricing configuration
const PLAN_PRICING: Record<string, { amount: number; currency: string; name: string }> = {
  daily: { amount: 99, currency: "usd", name: "Daily Plan" },
  weekly: { amount: 599, currency: "usd", name: "Weekly Plan" },
  monthly: { amount: 1999, currency: "usd", name: "Monthly Plan" },
  yearly: { amount: 14999, currency: "usd", name: "Yearly Plan" },
};

/**
 * Process payment with real Stripe
 */
async function processStripePayment(req: PaymentRequest): Promise<PaymentResponse> {
  const { planId, cardNumber, expiryMonth, expiryYear, cvc, cardholder } = req;

  // Validate inputs
  if (!planId || !cardNumber || !expiryMonth || !expiryYear || !cvc || !cardholder) {
    throw new Error("Missing required payment information");
  }

  // Validate plan exists
  const planConfig = PLAN_PRICING[planId];
  if (!planConfig) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  // Validate card number (basic check)
  const cardDigits = cardNumber.replace(/\D/g, "");
  if (cardDigits.length !== 16) {
    throw new Error("Invalid card number");
  }

  // Validate expiry
  if (expiryMonth < 1 || expiryMonth > 12) {
    throw new Error("Invalid expiry month");
  }

  const currentYear = new Date().getFullYear() % 100;
  if (expiryYear < currentYear) {
    throw new Error("Card has expired");
  }

  // Validate CVV
  if (cvc.length < 3 || cvc.length > 4) {
    throw new Error("Invalid CVV");
  }

  try {
    // Create a payment method with the card details
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: cardNumber,
        exp_month: expiryMonth,
        exp_year: 2000 + expiryYear,
        cvc: cvc,
      },
      billing_details: {
        name: cardholder,
      },
    });

    console.log("[Stripe] Created payment method:", paymentMethod.id);

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: planConfig.amount,
      currency: planConfig.currency,
      payment_method: paymentMethod.id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      description: `FitLife ${planConfig.name} subscription`,
      metadata: {
        planId: planId,
        plan_name: planConfig.name,
      },
    });

    console.log("[Stripe] Payment intent created:", paymentIntent.id, "Status:", paymentIntent.status);

    // Check if payment succeeded
    if (paymentIntent.status === "succeeded") {
      return {
        success: true,
        transactionId: paymentIntent.id,
        planId: planId,
        message: "Payment processed successfully",
      };
    } else if (paymentIntent.status === "requires_action") {
      // Payment requires additional action (e.g., 3D Secure)
      return {
        success: false,
        transactionId: paymentIntent.id,
        planId: planId,
        message: "Payment requires additional authentication",
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }
  } catch (error) {
    console.error("[Stripe] Payment error:", error);
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Payment failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Register payment routes
 */
export function registerPaymentRoutes(app: Express) {
  app.post("/api/payments/subscribe", async (req: Request, res: Response) => {
    try {
      const paymentReq = req.body as PaymentRequest;

      // Process payment with Stripe
      const result = await processStripePayment(paymentReq);

      res.json(result);
    } catch (error) {
      console.error("[Payments] Error:", error);
      const message = error instanceof Error ? error.message : "Payment processing failed";
      res.status(400).json({
        success: false,
        message,
      });
    }
  });

  app.post("/api/payments/verify", async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID required",
        });
      }

      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);

      res.json({
        success: paymentIntent.status === "succeeded",
        verified: paymentIntent.status === "succeeded",
        transactionId: paymentIntent.id,
        status: paymentIntent.status,
      });
    } catch (error) {
      console.error("[Payments] Verification error:", error);
      res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }
  });

  // Webhook endpoint for Stripe events (optional but recommended)
  app.post("/api/payments/webhook", async (req: Request, res: Response) => {
    try {
      const event = req.body;

      switch (event.type) {
        case "payment_intent.succeeded":
          console.log("[Stripe Webhook] Payment succeeded:", event.data.object.id);
          break;
        case "payment_intent.payment_failed":
          console.log("[Stripe Webhook] Payment failed:", event.data.object.id);
          break;
        case "charge.refunded":
          console.log("[Stripe Webhook] Charge refunded:", event.data.object.id);
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[Payments Webhook] Error:", error);
      res.status(400).json({ error: "Webhook processing failed" });
    }
  });
}
