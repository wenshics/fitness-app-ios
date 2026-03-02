import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import {
  findEmailSessionUser,
  getStripeCustomerId,
  saveStripeSubscription,
  getStripeSubscription,
  findUserByStripeCustomerId,
} from "../db";

/**
 * Production Stripe subscription integration.
 *
 * Flow:
 *  1. POST /api/payments/create-subscription
 *     - Authenticates the user via Bearer token
 *     - Creates (or reuses) a Stripe Customer for the user
 *     - Creates a Stripe Subscription with a 7-day free trial
 *     - Returns the PaymentIntent client_secret so the app can present Payment Sheet
 *
 *  2. App presents Stripe Payment Sheet with the client_secret
 *     - Stripe collects and tokenises the card securely (PCI-compliant)
 *     - On success, the PaymentIntent is confirmed and the subscription activates
 *
 *  3. POST /api/payments/subscription-status
 *     - Returns current subscription status for the authenticated user
 *
 *  4. POST /api/payments/cancel-subscription
 *     - Cancels the Stripe subscription at period end
 *
 *  5. POST /api/payments/webhook
 *     - Handles Stripe events (subscription activated, payment failed, etc.)
 */

const COOKIE_NAME = "app_session_id";

// Lazy Stripe initialisation
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    // Support both STRIPE_SK (our alias) and STRIPE_SECRET_KEY (standard)
    const key = process.env.STRIPE_SK || process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Stripe secret key not configured (STRIPE_SK or STRIPE_SECRET_KEY)");
    }
    _stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}

/** Map our internal plan IDs to Stripe Price IDs (created on demand if missing). */
const PLAN_CONFIG: Record<string, { amount: number; interval: Stripe.PriceCreateParams.Recurring.Interval; intervalCount: number; name: string }> = {
  daily:   { amount: 99,    interval: "day",   intervalCount: 1,  name: "Pulse Daily"   },
  weekly:  { amount: 599,   interval: "week",  intervalCount: 1,  name: "Pulse Weekly"  },
  monthly: { amount: 1999,  interval: "month", intervalCount: 1,  name: "Pulse Monthly" },
  yearly:  { amount: 14999, interval: "year",  intervalCount: 1,  name: "Pulse Yearly"  },
};

/** Cache of planId → Stripe Price ID to avoid re-creating prices on every request. */
const priceIdCache: Record<string, string> = {};

/**
 * Get or create a Stripe Price for a given plan.
 * In production you should create these once in the Stripe Dashboard and hard-code the IDs.
 */
async function getOrCreateStripePriceId(planId: string): Promise<string> {
  if (priceIdCache[planId]) return priceIdCache[planId];

  const stripe = getStripe();
  const config = PLAN_CONFIG[planId];
  if (!config) throw new Error(`Unknown plan: ${planId}`);

  // Search for an existing active price with this lookup_key
  const lookupKey = `pulse_${planId}`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data.length > 0) {
    priceIdCache[planId] = existing.data[0].id;
    return existing.data[0].id;
  }

  // Create a Product + Price
  const product = await stripe.products.create({ name: config.name });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: config.amount,
    currency: "usd",
    recurring: { interval: config.interval, interval_count: config.intervalCount },
    lookup_key: lookupKey,
  });

  priceIdCache[planId] = price.id;
  console.log(`[Stripe] Created price ${price.id} for plan ${planId}`);
  return price.id;
}

/** Extract the authenticated user from the request (Bearer token or cookie). */
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearerToken || cookieToken;

  console.log("[Payments] getAuthenticatedUser:", {
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.slice(0, 20),
    hasBearerToken: !!bearerToken,
    bearerTokenLength: bearerToken?.length,
    bearerTokenPrefix: bearerToken?.slice(0, 20),
    hasCookieToken: !!cookieToken,
    cookiesKeys: Object.keys(req.cookies || {}),
    tokenSource: bearerToken ? "bearer" : cookieToken ? "cookie" : "none",
  });

  if (!token) {
    console.log("[Payments] No token found — returning null");
    return null;
  }

  console.log("[Payments] Looking up token:", token.slice(0, 20) + "...", "(length:", token.length + ")");
  const user = await findEmailSessionUser(token);
  console.log("[Payments] findEmailSessionUser result:", {
    found: !!user,
    userId: user?.userId,
    email: user?.email,
  });
  return user;
}

export function registerPaymentRoutes(app: Express) {
  // ── 1. Create subscription & return PaymentSheet client_secret ──────────────
  app.post("/api/payments/create-subscription", async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { planId } = req.body as { planId: string };
      if (!planId || !PLAN_CONFIG[planId]) {
        return res.status(400).json({ error: `Invalid plan: ${planId}` });
      }

      const stripe = getStripe();

      // Get or create Stripe Customer
      let stripeCustomerId = await getStripeCustomerId(user.userId);
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name ?? undefined,
          metadata: { userId: String(user.userId) },
        });
        stripeCustomerId = customer.id;
        await saveStripeSubscription(user.userId, { stripeCustomerId });
        console.log(`[Stripe] Created customer ${stripeCustomerId} for user ${user.userId}`);
      }

      // Check if user already has an active subscription
      const existing = await getStripeSubscription(user.userId);
      if (existing?.stripeSubscriptionId && existing.stripeSubscriptionStatus === "active") {
        // Upgrade: update the existing subscription's price
        const priceId = await getOrCreateStripePriceId(planId);
        const sub = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
        await stripe.subscriptions.update(existing.stripeSubscriptionId, {
          items: [{ id: sub.items.data[0].id, price: priceId }],
          proration_behavior: "create_prorations",
        });
        await saveStripeSubscription(user.userId, {
          stripePriceId: priceId,
          stripeSubscriptionStatus: "active",
        });
        return res.json({ success: true, upgraded: true, subscriptionId: existing.stripeSubscriptionId });
      }

      // Create a new Subscription with 7-day trial
      const priceId = await getOrCreateStripePriceId(planId);
      const trialEnd = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days from now

      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        trial_end: trialEnd,
        expand: ["latest_invoice.payment_intent"],
      });

      // Save subscription info to DB
      await saveStripeSubscription(user.userId, {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeSubscriptionStatus: subscription.status,
        stripeTrialEnd: new Date(trialEnd * 1000),
      });

      // Extract the PaymentIntent client_secret for the Payment Sheet
      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent | null;
      const clientSecret = paymentIntent?.client_secret ?? null;

      console.log(`[Stripe] Created subscription ${subscription.id} for user ${user.userId}, status: ${subscription.status}`);

      res.json({
        success: true,
        subscriptionId: subscription.id,
        clientSecret,
        trialEnd: trialEnd,
        planId,
      });
    } catch (error) {
      console.error("[Stripe] create-subscription error:", error);
      const message = error instanceof Error ? error.message : "Failed to create subscription";
      res.status(500).json({ error: message });
    }
  });

  // ── 2. Get subscription status for the authenticated user ──────────────────
  app.get("/api/payments/subscription-status", async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const sub = await getStripeSubscription(user.userId);
      if (!sub?.stripeSubscriptionId) {
        return res.json({ hasSubscription: false });
      }

      // Optionally refresh from Stripe for live status
      try {
        const stripe = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        await saveStripeSubscription(user.userId, {
          stripeSubscriptionStatus: stripeSub.status,
          stripeTrialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        });
        return res.json({
          hasSubscription: true,
          status: stripeSub.status,
          planId: sub.stripePriceId,
          trialEnd: stripeSub.trial_end,
          currentPeriodEnd: (stripeSub as any).current_period_end,
        });
      } catch {
        // Return cached status if Stripe is unavailable
        return res.json({
          hasSubscription: true,
          status: sub.stripeSubscriptionStatus,
          planId: sub.stripePriceId,
          trialEnd: sub.stripeTrialEnd ? Math.floor(sub.stripeTrialEnd.getTime() / 1000) : null,
        });
      }
    } catch (error) {
      console.error("[Stripe] subscription-status error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // ── 3. Cancel subscription ─────────────────────────────────────────────────
  app.post("/api/payments/cancel-subscription", async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const sub = await getStripeSubscription(user.userId);
      if (!sub?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const stripe = getStripe();
      // Cancel at period end (user keeps access until the end of the billing period)
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await saveStripeSubscription(user.userId, {
        stripeSubscriptionStatus: "canceling",
      });

      console.log(`[Stripe] Subscription ${sub.stripeSubscriptionId} set to cancel at period end`);
      res.json({ success: true, message: "Subscription will cancel at end of billing period" });
    } catch (error) {
      console.error("[Stripe] cancel-subscription error:", error);
      const message = error instanceof Error ? error.message : "Failed to cancel subscription";
      res.status(500).json({ error: message });
    }
  });

  // ── 4. Restore purchase endpoint ─────────────────────────────────────────────
  app.post("/api/payments/restore-purchase", async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check if user has an existing Stripe subscription
      const sub = await getStripeSubscription(user.userId);
      if (!sub?.stripeSubscriptionId) {
        return res.json({ subscription: null, message: "No existing subscription found" });
      }

      // Verify the subscription is still active in Stripe
      const stripe = getStripe();
      const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

      if (stripeSubscription.status === "active" || stripeSubscription.status === "trialing") {
        // Subscription is valid, return it
        // Extract plan from price ID (e.g., "price_1234_monthly" -> "monthly")
        const stripePriceId = sub.stripePriceId || "";
        const planId = stripePriceId.split("_").pop() || "monthly";
        return res.json({
          subscription: {
            plan: planId,
            status: stripeSubscription.status,
            currentPeriodEnd: (stripeSubscription as any).current_period_end,
            trialEnd: (stripeSubscription as any).trial_end,
          },
          message: "Subscription restored successfully",
        });
      } else {
        // Subscription is not active
        return res.json({ subscription: null, message: "Subscription is not active" });
      }
    } catch (error) {
      console.error("[Stripe] restore-purchase error:", error);
      const message = error instanceof Error ? error.message : "Failed to restore purchase";
      res.status(500).json({ error: message });
    }
  });

  // ── 5. Webhook handler ─────────────────────────────────────────────────────
  app.post("/api/payments/webhook", async (req: Request, res: Response) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        const sig = req.headers["stripe-signature"] as string;
        // req.body must be the raw buffer when verifying signature
        const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
        event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
      } else {
        // No webhook secret configured — trust the payload (development only)
        event = req.body as Stripe.Event;
      }
    } catch (err) {
      console.error("[Stripe Webhook] Signature verification failed:", err);
      return res.status(400).json({ error: "Webhook signature verification failed" });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const user = await findUserByStripeCustomerId(sub.customer as string);
          if (user) {
            await saveStripeSubscription(user.id, {
              stripeSubscriptionId: sub.id,
              stripeSubscriptionStatus: sub.status,
              stripeTrialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
            });
            console.log(`[Stripe Webhook] Updated subscription status to ${sub.status} for user ${user.id}`);
          }
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const user = await findUserByStripeCustomerId(sub.customer as string);
          if (user) {
            await saveStripeSubscription(user.id, {
              stripeSubscriptionStatus: "canceled",
            });
            console.log(`[Stripe Webhook] Subscription canceled for user ${user.id}`);
          }
          break;
        }
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          if ((invoice as any).subscription) {
            const user = await findUserByStripeCustomerId(invoice.customer as string);
            if (user) {
              await saveStripeSubscription(user.id, {
                stripeSubscriptionStatus: "active",
              });
              console.log(`[Stripe Webhook] Payment succeeded for user ${user.id}`);
            }
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const user = await findUserByStripeCustomerId(invoice.customer as string);
          if (user) {
            await saveStripeSubscription(user.id, {
              stripeSubscriptionStatus: "past_due",
            });
            console.log(`[Stripe Webhook] Payment failed for user ${user.id}`);
          }
          break;
        }
      }
    } catch (err) {
      console.error("[Stripe Webhook] Handler error:", err);
      // Still return 200 to prevent Stripe from retrying
    }

    res.json({ received: true });
  });

  // ── 5. Confirm payment with card payment method ────────────────────────────
  // Called by the custom credit card form to confirm the payment intent
  app.post("/api/payments/confirm-payment", async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ success: false, error: "Authentication required" });
      }

      const { clientSecret, paymentMethodId } = req.body as {
        clientSecret?: string;
        paymentMethodId?: string;
      };

      if (!clientSecret || !paymentMethodId) {
        return res.status(400).json({
          success: false,
          error: "clientSecret and paymentMethodId are required",
        });
      }

      const stripe = getStripe();

      // Confirm the payment intent with the payment method
      const paymentIntent = await stripe.paymentIntents.confirm(clientSecret, {
        payment_method: paymentMethodId,
      });

      console.log(`[Stripe] Payment intent confirmed: ${paymentIntent.id}, status: ${paymentIntent.status}`);

      if (paymentIntent.status === "succeeded") {
        // Payment succeeded — subscription should now be active
        res.json({
          success: true,
          message: "Payment successful",
          paymentIntentId: paymentIntent.id,
        });
      } else if (paymentIntent.status === "requires_action") {
        // Additional authentication required (3D Secure, etc.)
        res.status(402).json({
          success: false,
          error: "Additional authentication required",
          clientSecret: paymentIntent.client_secret,
        });
      } else {
        res.status(402).json({
          success: false,
          error: `Payment failed: ${paymentIntent.status}`,
        });
      }
    } catch (error) {
      console.error("[Stripe] confirm-payment error:", error);
      const message = error instanceof Error ? error.message : "Payment confirmation failed";
      res.status(500).json({ success: false, error: message });
    }
  });

  // ── Legacy endpoint kept for backward compatibility ────────────────────────
  // The old payment-info.tsx screen called /api/payments/subscribe.
  // We redirect it to the new flow.
  app.post("/api/payments/subscribe", async (req: Request, res: Response) => {
    const { planId } = req.body as { planId?: string };
    if (!planId) {
      return res.status(400).json({ success: false, message: "planId is required" });
    }

    // Check if Stripe is configured
    const stripeKey = process.env.STRIPE_SK || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      // Mock mode for development without keys
      const mockId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return res.json({ success: true, transactionId: mockId, planId, message: "Payment processed (mock mode)" });
    }

    // With Stripe configured, this endpoint is no longer the right one to call.
    // The app should use /api/payments/create-subscription instead.
    return res.status(400).json({
      success: false,
      message: "Please use /api/payments/create-subscription for real payments",
    });
  });
}
