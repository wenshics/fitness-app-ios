import { describe, it, expect, beforeAll, afterAll } from "vitest";
// @ts-ignore
import fetch from "node-fetch";

const API_BASE = "http://localhost:3000";
const TEST_EMAIL = `test-session-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPassword123!";
const TEST_NAME = "Session Test User";
const TEST_BIRTHDAY = "1990-01-15";
const TEST_HEIGHT = 175;
const TEST_WEIGHT = 70;

describe("Auth Session Debug - Full Login Flow", () => {
  let sessionToken: string;
  let userId: number;

  it("should create a user with profile data", async () => {
    const response = await fetch(`${API_BASE}/api/auth/email-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
        birthday: TEST_BIRTHDAY,
        height: TEST_HEIGHT,
        weight: TEST_WEIGHT,
      }),
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as any;
    expect(data.success).toBe(true);
    expect(data.sessionToken).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.birthday).toBe(TEST_BIRTHDAY);
    expect(data.user.heightCm).toBe(TEST_HEIGHT);
    expect(data.user.weightKg).toBe(TEST_WEIGHT);

    sessionToken = data.sessionToken;
    userId = parseInt(data.user.id);

    console.log("[Test] Signup successful:", {
      sessionToken: sessionToken.slice(0, 20) + "...",
      userId,
      userBirthday: data.user.birthday,
      userHeight: data.user.heightCm,
      userWeight: data.user.weightKg,
    });
  });

  it("should retrieve user info with /api/auth/me using Bearer token", async () => {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    console.log("[Test] /api/auth/me response status:", response.status);
    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(TEST_EMAIL);
    expect(data.user.birthday).toBe(TEST_BIRTHDAY);
    expect(data.user.heightCm).toBe(TEST_HEIGHT);
    expect(data.user.weightKg).toBe(TEST_WEIGHT);

    console.log("[Test] /api/auth/me successful:", {
      userEmail: data.user.email,
      userBirthday: data.user.birthday,
      userHeight: data.user.heightCm,
      userWeight: data.user.weightKg,
    });
  });

  it("should be able to call payment endpoint with Bearer token", async () => {
    const response = await fetch(`${API_BASE}/api/payments/subscription-status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    console.log("[Test] /api/payments/subscription-status response status:", response.status);

    if (response.status === 401) {
      const errorData = (await response.json()) as any;
      console.error("[Test] Payment endpoint returned 401:", errorData);
      throw new Error(`Payment endpoint auth failed: ${errorData.error}`);
    }

    expect(response.status).toBe(200);
    const data = (await response.json()) as any;
    console.log("[Test] Payment endpoint successful:", data);
  });

  it("should be able to login again and get the same user data", async () => {
    const response = await fetch(`${API_BASE}/api/auth/email-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as any;
    expect(data.success).toBe(true);
    expect(data.sessionToken).toBeDefined();
    expect(data.user.birthday).toBe(TEST_BIRTHDAY);
    expect(data.user.heightCm).toBe(TEST_HEIGHT);
    expect(data.user.weightKg).toBe(TEST_WEIGHT);

    const newSessionToken = data.sessionToken;

    console.log("[Test] Login successful:", {
      newSessionToken: newSessionToken.slice(0, 20) + "...",
      userBirthday: data.user.birthday,
      userHeight: data.user.heightCm,
      userWeight: data.user.weightKg,
    });

    // Test with new token
    const meResponse = await fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${newSessionToken}`,
      },
    });

    expect(meResponse.status).toBe(200);
    const meData = (await meResponse.json()) as any;
    expect(meData.user.birthday).toBe(TEST_BIRTHDAY);
    expect(meData.user.heightCm).toBe(TEST_HEIGHT);
    expect(meData.user.weightKg).toBe(TEST_WEIGHT);

    console.log("[Test] /api/auth/me with new token successful");
  });
});
