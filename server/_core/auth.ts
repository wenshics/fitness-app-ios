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
    loginMethod?: string;
    createdAt: Date;
  }
>();

// Simple in-memory user store for email/password auth
const users = new Map<
  string,
  {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
  }
>();

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function registerAuthRoutes(app: Express) {
  // Email/password signup endpoint
  app.post("/api/auth/email-signup", async (req: Request, res: Response) => {
    try {
      const { email: rawEmail, password: rawPassword, name: rawName } = req.body;
      const email = rawEmail?.trim().toLowerCase();
      const password = rawPassword?.trim();
      const name = rawName?.trim();

      if (!email || !password || !name) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Check if user already exists
      const existingUser = Array.from(users.values()).find(u => u.email === email);
      if (existingUser) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      // Create new user
      const userId = `user-${Date.now()}`;
      const passwordHash = hashPassword(password);
      console.log("[Auth] Signup - storing user:", { email, name, passwordLength: password.length, passwordHashLength: passwordHash.length, passwordHashFirst20: passwordHash.substring(0, 20) });
      users.set(email, {
        id: userId,
        name,
        email,
        passwordHash,
        createdAt: new Date(),
      });

      // Create session
      const sessionToken = generateSessionToken();
      sessions.set(sessionToken, {
        userId,
        userName: name,
        email,
        loginMethod: "email",
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

      res.json({
        success: true,
        sessionToken,
        user: {
          id: userId,
          openId: userId,
          name,
          email,
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[Auth] Email signup failed", error);
      res.status(500).json({ error: "Signup failed", success: false });
    }
  });

  // Email/password login endpoint
  app.post("/api/auth/email-login", async (req: Request, res: Response) => {
    try {
      const { email: rawEmail, password: rawPassword } = req.body;
      const email = rawEmail?.trim().toLowerCase();
      const password = rawPassword?.trim();

      if (!email || !password) {
        res.status(400).json({ error: "Missing email or password" });
        return;
      }

      // Find user
      console.log("[Auth] Looking for user with email:", email);
      const user = Array.from(users.values()).find(u => u.email === email);
      console.log("[Auth] User found:", !!user);
      
      if (!user) {
        console.log("[Auth] User not found");
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      
      const passwordMatch = verifyPassword(password, user.passwordHash);
      const hashedInput = hashPassword(password);
      console.log("[Auth] Password match:", passwordMatch, { passwordLength: password.length, storedHashFirst20: user.passwordHash.substring(0, 20), inputHashFirst20: hashedInput.substring(0, 20) });
      
      if (!passwordMatch) {
        console.log("[Auth] Password mismatch");
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Create session
      const sessionToken = generateSessionToken();
      sessions.set(sessionToken, {
        userId: user.id,
        userName: user.name,
        email: user.email,
        loginMethod: "email",
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

      res.json({
        success: true,
        sessionToken,
        user: {
          id: user.id,
          openId: user.id,
          name: user.name,
          email: user.email,
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("[Auth] Email login failed", error);
      res.status(500).json({ error: "Login failed", success: false });
    }
  });

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
          loginMethod: session?.loginMethod || "demo",
          lastSignedIn: session?.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session for email/password auth (sets cookie)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        req.body.token;

      if (!token || !sessions.has(token)) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }

      const session = sessions.get(token);
      if (!session) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }

      // Set cookie for web
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: ONE_YEAR_MS,
      };
      res.cookie(COOKIE_NAME, token, cookieOptions);

      res.json({
        success: true,
        user: {
          id: session.userId,
          openId: session.userId,
          name: session.userName,
          email: session.email,
          loginMethod: session.loginMethod || "email",
          lastSignedIn: session.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
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
