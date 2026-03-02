import { describe, it, expect } from "vitest";
// @ts-ignore
import fetch from "node-fetch";

const API_BASE = "http://localhost:3000";

describe("User Payment Flow - Real Scenario", () => {
  it("should complete full flow: signup -> check subscription -> create subscription", async () => {
    const TEST_EMAIL = `user-flow-${Date.now()}@example.com`;
    const TEST_PASSWORD = "TestPassword123!";

    // 1. Signup
    console.log("[Flow] 1. Signing up...");
    const signupRes = await fetch(`${API_BASE}/api/auth/email-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: "Flow Test User",
        birthday: "1990-01-15",
        height: 175,
        weight: 70,
      }),
    });

    expect(signupRes.status).toBe(200);
    const signupData = (await signupRes.json()) as any;
    const sessionToken = signupData.sessionToken;
    console.log("[Flow] Signup successful, token:", sessionToken.slice(0, 30) + "...");

    // 2. Check subscription status (user navigates to Profile tab)
    console.log("[Flow] 2. Checking subscription status...");
    const statusRes = await fetch(`${API_BASE}/api/payments/subscription-status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(statusRes.status).toBe(200);
    const statusData = (await statusRes.json()) as any;
    expect(statusData.hasSubscription).toBe(false);
    console.log("[Flow] Subscription status checked, has subscription:", statusData.hasSubscription);

    // 3. Create subscription (user taps Subscribe button and selects a plan)
    console.log("[Flow] 3. Creating subscription...");
    const createRes = await fetch(`${API_BASE}/api/payments/create-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ planId: "monthly" }),
    });

    console.log("[Flow] create-subscription response status:", createRes.status);
    if (createRes.status !== 200) {
      const errorText = await createRes.text();
      console.error("[Flow] Error response:", errorText);
    }

    expect(createRes.status).toBe(200);
    const createData = (await createRes.json()) as any;
    expect(createData.clientSecret).toBeDefined();
    console.log("[Flow] Subscription created, clientSecret received");

    // 4. Verify subscription is now active
    console.log("[Flow] 4. Verifying subscription is active...");
    const verifyRes = await fetch(`${API_BASE}/api/payments/subscription-status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(verifyRes.status).toBe(200);
    const verifyData = (await verifyRes.json()) as any;
    expect(verifyData.hasSubscription).toBe(true);
    console.log("[Flow] Subscription verified, status:", verifyData.status);

    console.log("[Flow] ✓ Full flow completed successfully!");
  });

  it("should handle multiple logins and maintain session", async () => {
    const TEST_EMAIL = `multi-login-${Date.now()}@example.com`;
    const TEST_PASSWORD = "TestPassword123!";

    // Signup
    const signupRes = await fetch(`${API_BASE}/api/auth/email-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: "Multi Login User",
        birthday: "1990-01-15",
        height: 175,
        weight: 70,
      }),
    });

    expect(signupRes.status).toBe(200);
    const signupData = (await signupRes.json()) as any;
    const token1 = signupData.sessionToken;
    console.log("[Flow] Signup token 1:", token1.slice(0, 30) + "...");

    // Verify token 1 works
    let res = await fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token1}` },
    });
    expect(res.status).toBe(200);
    console.log("[Flow] Token 1 verified");

    // Login again (simulating app restart)
    const login2Res = await fetch(`${API_BASE}/api/auth/email-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    expect(login2Res.status).toBe(200);
    const login2Data = (await login2Res.json()) as any;
    const token2 = login2Data.sessionToken;
    console.log("[Flow] Login token 2:", token2.slice(0, 30) + "...");

    // Verify token 2 works
    res = await fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token2}` },
    });
    expect(res.status).toBe(200);
    console.log("[Flow] Token 2 verified");

    // Old token should still work (since we're not enforcing single session)
    res = await fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token1}` },
    });
    console.log("[Flow] Old token 1 status after new login:", res.status);
    // Note: This might be 200 or 401 depending on implementation
  });
});
