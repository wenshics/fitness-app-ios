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
    const mysql = await import("mysql2/promise");
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log("[Database] Initializing tables...");
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        loginMethod VARCHAR(64),
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS email_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        name TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        birthday VARCHAR(20),
        heightCm INT,
        weightKg INT,
        stripeCustomerId VARCHAR(64),
        stripeSubscriptionId VARCHAR(64),
        stripePriceId VARCHAR(64),
        stripeSubscriptionStatus VARCHAR(32),
        stripeTrialEnd TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS email_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(128) NOT NULL UNIQUE,
        userId INT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expiresAt TIMESTAMP NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS email_verification_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(320) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        usedAt TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(320) NOT NULL,
        token VARCHAR(128) NOT NULL UNIQUE,
        expiresAt TIMESTAMP NOT NULL,
        usedAt TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await connection.execute(sql);
    }

    await connection.end();
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

  // Enable CORS for all routes - reflect the request origin to support credentials
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

    // Handle preflight requests
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
