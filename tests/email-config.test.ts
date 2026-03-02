import { describe, it, expect } from "vitest";

describe("Email Configuration", () => {
  it("should have GMAIL_USER environment variable set", () => {
    const gmailUser = process.env.GMAIL_USER;
    expect(gmailUser).toBeDefined();
    expect(gmailUser).toBe("pulse.daily.workout@gmail.com");
  });

  it("should have GMAIL_APP_PASSWORD environment variable set", () => {
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    expect(gmailPass).toBeDefined();
    expect(gmailPass?.length).toBeGreaterThan(0);
  });

  it("should have APP_URL environment variable set", () => {
    const appUrl = process.env.APP_URL;
    expect(appUrl).toBeDefined();
    expect(appUrl).toBe("https://fitness-app-ios-production.up.railway.app");
  });

  it("should validate email configuration", () => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const appUrl = process.env.APP_URL;

    expect(user).toBeTruthy();
    expect(pass).toBeTruthy();
    expect(appUrl).toBeTruthy();

    // Check that Gmail credentials are in expected format
    expect(user).toMatch(/@gmail\.com$/);
    expect(pass?.length).toBeGreaterThanOrEqual(16);
    expect(appUrl).toMatch(/^https:\/\//);
  });
});
