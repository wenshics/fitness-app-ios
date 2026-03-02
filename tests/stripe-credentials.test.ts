/**
 * Validates that the Stripe secret key (STRIPE_SK) is set and can authenticate
 * against the real Stripe API by fetching the account info.
 */
import { describe, it, expect } from "vitest";

describe("Stripe credentials", () => {
  it("STRIPE_SK is set in environment", () => {
    const key = process.env.STRIPE_SK;
    expect(key, "STRIPE_SK must be set").toBeTruthy();
    expect(key!.startsWith("sk_"), "Key must start with sk_").toBe(true);
  });

  it("can authenticate with Stripe API", async () => {
    const key = process.env.STRIPE_SK;
    if (!key) {
      throw new Error("STRIPE_SK not set");
    }

    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    expect(response.status, `Stripe API returned ${response.status}`).toBe(200);
    const account = (await response.json()) as { id: string; object: string };
    expect(account.object).toBe("account");
    expect(account.id).toBeTruthy();
    console.log("[Stripe] Authenticated as account:", account.id);
  }, 15000);
});
