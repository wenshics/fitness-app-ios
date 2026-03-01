/**
 * Validates Gmail SMTP credentials are configured and can authenticate.
 * Uses nodemailer's verify() which checks auth without sending a real email.
 */
import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("Gmail SMTP credentials", () => {
  it("GMAIL_USER and GMAIL_APP_PASSWORD env vars are set", () => {
    expect(process.env.GMAIL_USER).toBeTruthy();
    expect(process.env.GMAIL_APP_PASSWORD).toBeTruthy();
  });

  it("can authenticate with Gmail SMTP", async () => {
    const user = process.env.GMAIL_USER!;
    const pass = process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, "");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    // verify() checks the connection and auth — does NOT send any email
    await expect(transporter.verify()).resolves.toBe(true);
  }, 15000); // 15s timeout for network call
});
