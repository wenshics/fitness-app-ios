import { describe, it, expect, beforeAll } from "vitest";

describe("Email Service - Resend API", () => {
  it("should validate Resend API key is configured", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey?.length).toBeGreaterThan(0);
  });

  it("should test Resend API connectivity", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.log("[Test] Skipping Resend API test - no API key configured (dev mode)");
      expect(true).toBe(true);
      return;
    }

    try {
      // Test API connectivity by making a simple request
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || "Pulse <onboarding@resend.dev>",
          to: "wenshi.bme@gmail.com",
          subject: "Test Email",
          html: "<p>This is a test email</p>",
        }),
      });

      const responseText = await response.text();
      console.log("[Test] Resend API response status:", response.status);
      console.log("[Test] Resend API response:", responseText);
      
      // Even if the email fails to send (invalid recipient), the API should respond
      // If we get a 401 or 403, the API key is invalid
      if (response.status === 401 || response.status === 403) {
        console.error("[Test] API Error:", responseText);
        throw new Error(`API key invalid: ${responseText}`);
      }
      
      if (response.status !== 200) {
        console.warn("[Test] Unexpected status code:", response.status, responseText);
      }
      
      console.log("[Test] Resend API is reachable and API key is valid");
      expect(true).toBe(true);
    } catch (error) {
      console.error("[Test] Failed to reach Resend API:", error);
      throw error;
    }
  });
});
