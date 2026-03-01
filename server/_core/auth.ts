import type { Express, Request, Response } from "express";
import {
  createEmailUser,
  findEmailUserByEmail,
  verifyPassword,
  createEmailSession,
  findEmailSessionUser,
  deleteEmailSession,
  createVerificationCode,
  verifyEmailCode,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "../db";
import { sendVerificationCode, sendPasswordResetEmail } from "./email";

const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function cookieOptions(maxAge = ONE_YEAR_MS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
  };
}

export function registerAuthRoutes(app: Express) {
  // ── Email/password signup ──────────────────────────────────────────────────
  app.post("/api/auth/email-signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name, birthday, height, weight } = req.body;

      if (!email?.trim() || !password?.trim() || !name?.trim()) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Check duplicate
      const existing = await findEmailUserByEmail(email.trim());
      if (existing) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      const user = await createEmailUser(
        email.trim(),
        password.trim(),
        name.trim(),
        birthday?.trim() || undefined,
        height ? Math.round(parseFloat(height)) : undefined,
        weight ? Math.round(parseFloat(weight)) : undefined,
      );

      if (!user) {
        res.status(500).json({ error: "Failed to create account — database unavailable" });
        return;
      }

      const token = await createEmailSession(user.id);

      res.cookie(COOKIE_NAME, token, cookieOptions());
      res.json({
        success: true,
        sessionToken: token,
        user: {
          id: String(user.id),
          openId: String(user.id),
          name: user.name,
          email: user.email,
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[Auth] email-signup error:", err);
      res.status(500).json({ error: "Signup failed" });
    }
  });

  // ── Email/password login ───────────────────────────────────────────────────
  app.post("/api/auth/email-login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email?.trim() || !password?.trim()) {
        res.status(400).json({ error: "Missing email or password" });
        return;
      }

      const user = await findEmailUserByEmail(email.trim());
      if (!user || !verifyPassword(password.trim(), user.passwordHash)) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = await createEmailSession(user.id);

      res.cookie(COOKIE_NAME, token, cookieOptions());
      res.json({
        success: true,
        sessionToken: token,
        user: {
          id: String(user.id),
          openId: String(user.id),
          name: user.name,
          email: user.email,
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[Auth] email-login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Get current user (/api/auth/me) ───────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies?.[COOKIE_NAME];

      if (!token) {
        res.status(401).json({ error: "Not authenticated", user: null });
        return;
      }

      const session = await findEmailSessionUser(token);
      if (!session) {
        res.status(401).json({ error: "Session expired or invalid", user: null });
        return;
      }

      res.json({
        user: {
          id: String(session.userId),
          openId: String(session.userId),
          name: session.name,
          email: session.email,
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[Auth] /api/auth/me error:", err);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies?.[COOKIE_NAME];

      if (token) {
        await deleteEmailSession(token).catch(() => {});
      }

      res.clearCookie(COOKIE_NAME, cookieOptions(-1));
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] logout error:", err);
      res.json({ success: true }); // always succeed from client perspective
    }
  });

  // ── Establish session cookie (used after native token exchange) ───────────
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.body?.token;

      if (!token) {
        res.status(401).json({ error: "No token provided" });
        return;
      }

      const session = await findEmailSessionUser(token);
      if (!session) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }

      res.cookie(COOKIE_NAME, token, cookieOptions());
      res.json({
        success: true,
        user: {
          id: String(session.userId),
          openId: String(session.userId),
          name: session.name,
          email: session.email,
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[Auth] /api/auth/session error:", err);
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // ── Verify token ───────────────────────────────────────────────────────────
  app.post("/api/auth/verify", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.body?.token;

      if (!token) {
        res.status(401).json({ valid: false });
        return;
      }

      const session = await findEmailSessionUser(token);
      res.json({ valid: Boolean(session) });
    } catch (err) {
      res.status(401).json({ valid: false });
    }
  });

  // ── Send email verification code (after signup) ────────────────────────────
  app.post("/api/auth/send-verification", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email?.trim()) {
        res.status(400).json({ error: "Email required" });
        return;
      }
      const code = await createVerificationCode(email.trim());
      await sendVerificationCode(email.trim(), code);
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] send-verification error:", err);
      res.status(500).json({ error: "Failed to send verification email" });
    }
  });

  // ── Verify the 6-digit code ────────────────────────────────────────────────
  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email?.trim() || !code?.trim()) {
        res.status(400).json({ error: "Email and code required" });
        return;
      }
      const valid = await verifyEmailCode(email.trim(), code.trim());
      if (!valid) {
        res.status(400).json({ error: "Invalid or expired code" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] verify-email error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ── Forgot password — send reset email ────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email?.trim()) {
        res.status(400).json({ error: "Email required" });
        return;
      }
      const token = await createPasswordResetToken(email.trim());
      if (token) {
        // Determine app URL for the reset link
        const appUrl =
          process.env.APP_URL ||
          `${req.protocol}://${req.get("host")}`;
        await sendPasswordResetEmail(email.trim(), token, appUrl);
      }
      // Always respond success to avoid email enumeration
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] forgot-password error:", err);
      res.status(500).json({ error: "Failed to send reset email" });
    }
  });

  // ── Reset password with token ──────────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token?.trim() || !password?.trim()) {
        res.status(400).json({ error: "Token and new password required" });
        return;
      }
      if (password.trim().length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      const ok = await resetPasswordWithToken(token.trim(), password.trim());
      if (!ok) {
        res.status(400).json({ error: "Invalid or expired reset link" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] reset-password error:", err);
      res.status(500).json({ error: "Password reset failed" });
    }
  });
}
