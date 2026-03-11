import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerPaymentRoutes } from "./payments";
import { registerAuthRoutes } from "./auth";
import { validateEmailConfig } from "./email";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not set, skipping initialization");
    return;
  }

  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    console.log("[Database] Initializing tables...");

    // Run the initial schema (idempotent — uses IF NOT EXISTS)
    const fs = await import("fs");
    const path = await import("path");
    const migrationPath = path.join(process.cwd(), "supabase/migrations/001_initial_schema.sql");
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, "utf8");
      await pool.query(sql);
      console.log("[Database] Schema applied from migration file");
    } else {
      // Inline fallback for production builds where the file may not be present
      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(320) NOT NULL UNIQUE,
          name TEXT NOT NULL,
          "passwordHash" TEXT NOT NULL,
          birthday VARCHAR(20),
          "heightCm" INTEGER,
          "weightKg" INTEGER,
          "stripeCustomerId" VARCHAR(64),
          "stripeSubscriptionId" VARCHAR(64),
          "stripePriceId" VARCHAR(64),
          "stripeSubscriptionStatus" VARCHAR(32),
          "stripeTrialEnd" TIMESTAMPTZ,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS email_sessions (
          id SERIAL PRIMARY KEY,
          token VARCHAR(128) NOT NULL UNIQUE,
          "userId" INTEGER NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "expiresAt" TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS email_verification_codes (
          id SERIAL PRIMARY KEY,
          email VARCHAR(320) NOT NULL,
          code VARCHAR(6) NOT NULL,
          "expiresAt" TIMESTAMPTZ NOT NULL,
          "usedAt" TIMESTAMPTZ,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          email VARCHAR(320) NOT NULL,
          token VARCHAR(128) NOT NULL UNIQUE,
          "expiresAt" TIMESTAMPTZ NOT NULL,
          "usedAt" TIMESTAMPTZ,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS user_awards (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "awardId" VARCHAR(64) NOT NULL,
          "awardName" VARCHAR(128) NOT NULL,
          "awardDescription" TEXT,
          "awardIcon" VARCHAR(128),
          "unlockedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE ("userId", "awardId")
        );
      `);
    }

    await pool.end();
    console.log("[Database] Tables initialized successfully");
  } catch (error) {
    console.error("[Database] Failed to initialize tables:", error);
  }
}

async function startServer() {
  // Initialize database first
  await initializeDatabase();

  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // Validate email configuration
  const emailConfig = validateEmailConfig();
  if (!emailConfig.valid) {
    console.warn("[Email] Configuration warning:", emailConfig.error);
  }

  registerOAuthRoutes(app);
  registerPaymentRoutes(app);
  registerAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // ── App Store required legal pages ──────────────────────────────────────────
  app.get("/privacy", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pulse — Privacy Policy</title>
<style>body{font-family:-apple-system,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111;line-height:1.6}h1{color:#0D9488}h2{margin-top:32px}</style>
</head><body>
<h1>Privacy Policy</h1>
<p><em>Last updated: March 2026</em></p>
<p>Pulse ("we", "our", or "us") is committed to protecting your privacy. This policy explains what information we collect and how we use it.</p>
<h2>Information We Collect</h2>
<ul>
  <li><strong>Account information:</strong> name, email address, and hashed password when you register.</li>
  <li><strong>Profile data:</strong> optional birthday, height, and weight you provide.</li>
  <li><strong>Subscription data:</strong> billing details are handled securely by Stripe. We do not store full card numbers.</li>
  <li><strong>Usage data:</strong> workout logs and achievements stored locally on your device.</li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
  <li>To provide and improve the Pulse app experience.</li>
  <li>To process subscription payments via Stripe.</li>
  <li>To send workout reminders (only with your permission).</li>
  <li>To send account-related emails (verification, password reset).</li>
</ul>
<h2>Data Sharing</h2>
<p>We do not sell your personal information. We share data only with trusted service providers (Stripe for payments, email providers for transactional emails) as necessary to operate the app.</p>
<h2>Data Retention</h2>
<p>You may delete your account at any time by contacting us. We will remove your personal data within 30 days of a verified deletion request.</p>
<h2>Children's Privacy</h2>
<p>Pulse is not directed at children under 13. We do not knowingly collect data from children under 13.</p>
<h2>Contact</h2>
<p>For privacy questions, contact us at: <a href="mailto:support@pulsefit.app">support@pulsefit.app</a></p>
</body></html>`);
  });

  app.get("/terms", (_req, res) => {
    res.redirect("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/");
  });

  app.get("/support", (_req, res) => {
    const path = require("path");
    res.sendFile(path.join(process.cwd(), "support.html"));
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
