import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "app_session_id";

// Simple in-memory session store for demo
const sessions = new Map<
  string,
  {
    userId: string;
    userName: string;
    email: string;
    createdAt: Date;
  }
>();

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function registerAuthRoutes(app: Express) {
  // Direct login endpoint for mobile apps (no OAuth, no deep links)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Create a demo user
      const userId = `user-${Date.now()}`;
      const sessionToken = generateSessionToken();

      // Store session
      sessions.set(sessionToken, {
        userId,
        userName: "Demo User",
        email: "demo@fitlife.app",
        createdAt: new Date(),
      });

      // Set cookie for web
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: ONE_YEAR_MS,
      };
      res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      // Return response for mobile
      res.json({
        success: true,
        sessionToken,
        user: {
          id: userId,
          openId: userId,
          name: "Demo User",
          email: "demo@fitlife.app",
          loginMethod: "demo",
          lastSignedIn: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed", success: false });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: -1,
    };
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });

  // Get current authenticated user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies[COOKIE_NAME];

      if (!token || !sessions.has(token)) {
        res.status(401).json({ error: "Not authenticated", user: null });
        return;
      }

      const session = sessions.get(token);
      res.json({
        user: {
          id: session?.userId,
          openId: session?.userId,
          name: session?.userName,
          email: session?.email,
          loginMethod: "demo",
          lastSignedIn: session?.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Verify session token
  app.post("/api/auth/verify", (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.cookies[COOKIE_NAME];

      if (!token || !sessions.has(token)) {
        res.status(401).json({ valid: false });
        return;
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("[Auth] /api/auth/verify failed:", error);
      res.status(401).json({ valid: false });
    }
  });
}
