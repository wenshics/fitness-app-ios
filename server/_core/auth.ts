import type { Express, Request, Response } from "express";
import {
  createEmailUser,
  findEmailUserByEmail,
  verifyPassword,
  isLegacyHash,
  rehashPassword,
  createEmailSession,
  findEmailSessionUser,
  deleteEmailSession,
  createVerificationCode,
  verifyEmailCode,
  createPasswordResetToken,
  resetPasswordWithToken,
  saveUserAward,
  getUserAwards,
  hasUserAward,
} from "../db";
import { getDb } from "../db";
import { emailUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendVerificationCode, sendPasswordResetEmail, validateEmailConfig } from "./email";

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
          birthday: birthday?.trim() || null,
          heightCm: height ? Math.round(parseFloat(height)) : null,
          weightKg: weight ? Math.round(parseFloat(weight)) : null,
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

      // Silently upgrade legacy (unsalted) hashes to the current salted format
      if (isLegacyHash(password.trim(), user.passwordHash)) {
        try {
          const db = await getDb();
          if (db) {
            await db
              .update(emailUsers)
              .set({ passwordHash: rehashPassword(password.trim()) })
              .where(eq(emailUsers.id, user.id));
            console.log(`[Auth] Upgraded legacy password hash for user ${user.id}`);
          }
        } catch (upgradeErr) {
          // Non-fatal — log and continue
          console.warn("[Auth] Failed to upgrade legacy hash:", upgradeErr);
        }
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
          birthday: user.birthday ?? null,
          heightCm: user.heightCm ?? null,
          weightKg: user.weightKg ?? null,
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
      const token = (
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies?.[COOKIE_NAME]
      )?.trim();

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
          birthday: session.birthday ?? null,
          heightCm: session.heightCm ?? null,
          weightKg: session.weightKg ?? null,
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
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.[COOKIE_NAME];
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
      const token = bearerToken || cookieToken?.trim();

      console.log("[Auth] logout called:", {
        hasBearerToken: !!bearerToken,
        hasCookieToken: !!cookieToken,
        tokenToDelete: token ? token.slice(0, 20) + "..." : null,
      });

      if (token) {
        await deleteEmailSession(token).catch((err) => {
          console.error("[Auth] Failed to delete session:", err);
        });
        console.log("[Auth] Session deleted for token:", token.slice(0, 20) + "...");
      }

      res.clearCookie(COOKIE_NAME, cookieOptions(-1));
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] logout error:", err);
      res.json({ success: true });
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
          birthday: session.birthday ?? null,
          heightCm: session.heightCm ?? null,
          weightKg: session.weightKg ?? null,
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
      // Find the user and create a session so they are auto-logged in
      const user = await findEmailUserByEmail(email.trim());
      if (!user) {
        res.status(400).json({ error: "Account not found" });
        return;
      }
      const sessionToken = await createEmailSession(user.id);
      res.json({
        success: true,
        sessionToken,
        user: {
          id: String(user.id),
          openId: String(user.id),
          name: user.name,
          email: user.email,
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
          birthday: user.birthday ?? null,
          heightCm: user.heightCm ?? null,
          weightKg: user.weightKg ?? null,
        },
      });
    } catch (err) {
      console.error("[Auth] verify-email error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ── Forgot password — send reset email ────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      console.log("[Auth] forgot-password request for:", email);
      
      if (!email?.trim()) {
        console.log("[Auth] forgot-password: missing email");
        res.status(400).json({ error: "Email required" });
        return;
      }
      
      // Check if email is configured
      const emailConfig = validateEmailConfig();
      if (!emailConfig.valid) {
        console.warn("[Auth] forgot-password: Email not configured -", emailConfig.error);
        // In development, still return success but log the issue
        console.log("[Auth] forgot-password: Would send reset email to:", email.trim());
        res.json({ success: true, warning: "Email service not configured (dev mode)" });
        return;
      }
      
      const token = await createPasswordResetToken(email.trim());
      console.log("[Auth] forgot-password token created:", token ? "yes" : "no (user not found)");
      
      if (token) {
        const appUrl = process.env.APP_URL || `https://${req.get("host")}`;
        console.log("[Auth] forgot-password appUrl:", appUrl);
        console.log("[Auth] forgot-password sending email to:", email.trim());
        
        try {
          await sendPasswordResetEmail(email.trim(), token, appUrl);
          console.log("[Auth] forgot-password email sent successfully");
        } catch (emailErr) {
          console.error("[Auth] forgot-password email send FAILED:", emailErr);
          // Don't fail the request - still return success to avoid email enumeration
        }
      }
      
      // Always respond success to avoid email enumeration
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] forgot-password error:", err);
      res.status(500).json({ error: "Failed to send reset email" });
    }
  });

  // ── Reset password web page ─────────────────────────────────────────────────
  app.get("/reset-password", async (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Pulse</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
            .container { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; max-width: 400px; width: 100%; }
            h1 { color: #0d9488; margin-bottom: 8px; font-size: 24px; }
            .error { color: #dc2626; background: #fee2e2; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Password Reset</h1>
            <div class="error">Invalid or missing reset token. Please request a new password reset link.</div>
          </div>
        </body>
        </html>
      `);
      return;
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - Pulse</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
          .container { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; max-width: 400px; width: 100%; }
          h1 { color: #0d9488; margin-bottom: 8px; font-size: 24px; }
          p { color: #666; margin-bottom: 24px; font-size: 14px; }
          .form-group { margin-bottom: 16px; }
          label { display: block; color: #333; font-weight: 500; margin-bottom: 6px; font-size: 14px; }
          input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: inherit; }
          input:focus { outline: none; border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1); }
          button { width: 100%; background: #0d9488; color: white; padding: 12px; border: none; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; margin-top: 8px; }
          button:hover { background: #0a6e68; }
          button:active { transform: scale(0.98); }
          .error { color: #dc2626; background: #fee2e2; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; display: none; }
          .success { color: #059669; background: #d1fae5; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; display: none; }
          .success-content { display: none; text-align: center; }
          .success-icon { font-size: 48px; margin-bottom: 16px; }
          .success-content h2 { color: #0d9488; margin-bottom: 8px; font-size: 20px; }
          .success-content p { color: #666; margin-bottom: 24px; }
          .app-button { background: #0d9488; color: white; padding: 12px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 600; margin-top: 12px; }
          .app-button:hover { background: #0a6e68; }
          .hidden { display: none !important; }
        </style>
      </head>
      <body>
        <div class="container">
          <div id="form-section">
            <h1>Reset Password</h1>
            <p>Enter your new password below.</p>
            <div class="error" id="error-msg"></div>
            <form id="reset-form">
              <div class="form-group">
                <label for="password">New Password</label>
                <input type="password" id="password" placeholder="At least 6 characters" required>
              </div>
              <div class="form-group">
                <label for="confirm">Confirm Password</label>
                <input type="password" id="confirm" placeholder="Re-enter password" required>
              </div>
              <button type="submit">Reset Password</button>
            </form>
          </div>
          <div class="success-content" id="success-section">
            <div class="success-icon">✓</div>
            <h2>Password Reset Successful</h2>
            <p>Your password has been reset. You can now log in with your new password.</p>
            <div id="mobile-content" style="display:none;">
              <a href="manus20260212000221://login" class="app-button">Open Pulse App</a>
              <p style="color:#6b7280;font-size:14px;margin-top:16px;">
                If the app doesn't open, please open Pulse manually and log in with your new password.
              </p>
            </div>
            <div id="desktop-content" style="display:none;">
              <p style="color:#374151;font-size:16px;margin-top:16px;">
                Open the Pulse app on your phone to log in with your new password.
              </p>
            </div>
          </div>
        </div>
        <script>
          const form = document.getElementById('reset-form');
          const errorMsg = document.getElementById('error-msg');
          const formSection = document.getElementById('form-section');
          const successSection = document.getElementById('success-section');
          const passwordInput = document.getElementById('password');
          const confirmInput = document.getElementById('confirm');
          const token = '${token}';

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.style.display = 'none';

            const password = passwordInput.value.trim();
            const confirm = confirmInput.value.trim();

            if (!password || !confirm) {
              errorMsg.textContent = 'Please fill in all fields';
              errorMsg.style.display = 'block';
              return;
            }

            if (password.length < 6) {
              errorMsg.textContent = 'Password must be at least 6 characters';
              errorMsg.style.display = 'block';
              return;
            }

            if (password !== confirm) {
              errorMsg.textContent = 'Passwords do not match';
              errorMsg.style.display = 'block';
              return;
            }

            try {
              const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
              });

              const data = await response.json();
              if (!response.ok) {
                errorMsg.textContent = data.error || 'Failed to reset password';
                errorMsg.style.display = 'block';
                return;
              }

              formSection.style.display = 'none';
              successSection.style.display = 'block';
              
              // Detect if user is on mobile
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              const mobileContent = document.getElementById('mobile-content');
              const desktopContent = document.getElementById('desktop-content');
              
              if (isMobile) {
                mobileContent.style.display = 'block';
              } else {
                desktopContent.style.display = 'block';
              }
            } catch (err) {
              errorMsg.textContent = 'Network error. Please try again.';
              errorMsg.style.display = 'block';
            }
          });
        </script>
      </body>
      </html>
    `);
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

  // ── Save user award ────────────────────────────────────────────────────────
  app.post("/api/awards/save", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies[COOKIE_NAME];

      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const session = await findEmailSessionUser(token);
      if (!session) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }

      const { awardId, awardName, awardDescription, awardIcon } = req.body;
      if (!awardId || !awardName) {
        res.status(400).json({ error: "Missing award data" });
        return;
      }

      const saved = await saveUserAward(session.userId, {
        id: awardId,
        name: awardName,
        description: awardDescription || "",
        icon: awardIcon || "",
      });

      res.json({ success: saved, message: saved ? "Award saved" : "Award already exists" });
    } catch (err) {
      console.error("[Awards] save error:", err);
      res.status(500).json({ error: "Failed to save award" });
    }
  });

  // ── Get user awards ────────────────────────────────────────────────────────
  app.get("/api/awards/list", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies[COOKIE_NAME];

      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const session = await findEmailSessionUser(token);
      if (!session) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }

      const awards = await getUserAwards(session.userId);
      res.json({ awards });
    } catch (err) {
      console.error("[Awards] list error:", err);
      res.status(500).json({ error: "Failed to retrieve awards" });
    }
  });

  // ── Check if user has specific award ────────────────────────────────────────
  app.get("/api/awards/check/:awardId", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies[COOKIE_NAME];

      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const session = await findEmailSessionUser(token);
      if (!session) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }

      const { awardId } = req.params;
      const hasAward = await hasUserAward(session.userId, awardId);
      res.json({ hasAward });
    } catch (err) {
      console.error("[Awards] check error:", err);
      res.status(500).json({ error: "Failed to check award" });
    }
  });
}
