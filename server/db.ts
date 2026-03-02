import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ---- Email/Password Auth Helpers ----
import { emailUsers, emailSessions, InsertEmailUser } from "../drizzle/schema";
import { randomBytes } from "crypto";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Simple deterministic hash — good enough for this app (use bcrypt in production) */
function hashPassword(password: string): string {
  return Buffer.from(password + "__salt_pulse_app__").toString("base64");
}

/** Legacy hash format used before the database migration (no salt) */
function hashPasswordLegacy(password: string): string {
  return Buffer.from(password).toString("base64");
}

/**
 * Verify a password against a stored hash.
 * Supports both the current salted format and the legacy unsalted format
 * (accounts created before the database migration).
 */
export function verifyPassword(password: string, hash: string): boolean {
  // Try current salted hash first
  if (hashPassword(password) === hash) return true;
  // Fall back to legacy unsalted hash (accounts created before DB migration)
  if (hashPasswordLegacy(password) === hash) return true;
  return false;
}

/**
 * Re-hash a password using the current algorithm.
 * Used to upgrade legacy hashes on successful login.
 */
export function rehashPassword(password: string): string {
  return hashPassword(password);
}

/** Returns true if the hash was created with the legacy (unsalted) algorithm */
export function isLegacyHash(password: string, hash: string): boolean {
  return hashPasswordLegacy(password) === hash && hashPassword(password) !== hash;
}

export async function createEmailUser(
  email: string,
  password: string,
  name: string,
  birthday?: string,
  heightCm?: number,
  weightKg?: number,
): Promise<{ id: number; email: string; name: string } | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[DB] createEmailUser: database not available");
    return null;
  }
  const passwordHash = hashPassword(password);
  const result = await db.insert(emailUsers).values({
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash,
    birthday: birthday ?? null,
    heightCm: heightCm ?? null,
    weightKg: weightKg ?? null,
  });
  return { id: Number(result[0].insertId), email, name };
}

export async function findEmailUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(emailUsers)
    .where(eq(emailUsers.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0] ?? null;
}

export async function createEmailSession(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete any existing sessions for this user to ensure only one active session per user
  try {
    await db.delete(emailSessions).where(eq(emailSessions.userId, userId));
    console.log(`[DB] Deleted old sessions for userId ${userId}`);
  } catch (err) {
    console.warn(`[DB] Failed to delete old sessions for userId ${userId}:`, err);
  }
  
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + ONE_YEAR_MS);
  await db.insert(emailSessions).values({ token, userId, expiresAt });
  console.log(`[DB] Created new session for userId ${userId}: ${token.slice(0, 20)}...`);
  return token;
}

export async function findEmailSessionUser(token: string) {
  const db = await getDb();
  if (!db) {
    console.error("[DB] findEmailSessionUser: database not available");
    return null;
  }
  
  const cleanToken = token.trim();
  console.log("[DB] findEmailSessionUser searching for token:", cleanToken.slice(0, 20) + "...", "(length:", cleanToken.length + ")");
  
  try {
    const rows = await db
    .select({
      userId: emailSessions.userId,
      expiresAt: emailSessions.expiresAt,
      email: emailUsers.email,
      name: emailUsers.name,
      birthday: emailUsers.birthday,
      heightCm: emailUsers.heightCm,
      weightKg: emailUsers.weightKg,
    })
    .from(emailSessions)
    .innerJoin(emailUsers, eq(emailSessions.userId, emailUsers.id))
    .where(eq(emailSessions.token, cleanToken))
    .limit(1);
  
  if (!rows[0]) {
    const allSessions = await db.select({ token: emailSessions.token }).from(emailSessions).limit(5);
    console.log("[DB] No matching session found. First 5 tokens in DB:", allSessions.map(s => s.token.slice(0, 20) + "..."));
    return null;
  }
  
  if (rows[0].expiresAt < new Date()) {
    console.log("[DB] Session found but expired");
    return null;
  }
  
    console.log("[DB] Session found and valid");
    return rows[0];
  } catch (error) {
    console.error("[DB] findEmailSessionUser error:", error);
    return null;
  }
}

export async function deleteEmailSession(token: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[DB] deleteEmailSession: database not available");
    return;
  }
  const cleanToken = token.trim();
  console.log("[DB] deleteEmailSession: deleting token", cleanToken.slice(0, 20) + "...");
  try {
    const result = await db.delete(emailSessions).where(eq(emailSessions.token, cleanToken));
    console.log("[DB] deleteEmailSession: deleted", result);
  } catch (err) {
    console.error("[DB] deleteEmailSession error:", err);
  }
}

// ---- Email Verification Helpers ----
import { emailVerificationCodes, passwordResetTokens } from "../drizzle/schema";
import { and, isNull } from "drizzle-orm";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createVerificationCode(email: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const code = generateCode();
  const expiresAt = new Date(Date.now() + TEN_MINUTES_MS);
  await db.insert(emailVerificationCodes).values({
    email: email.toLowerCase().trim(),
    code,
    expiresAt,
  });
  return code;
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(emailVerificationCodes)
    .where(
      and(
        eq(emailVerificationCodes.email, email.toLowerCase().trim()),
        eq(emailVerificationCodes.code, code),
        isNull(emailVerificationCodes.usedAt),
      ),
    )
    .orderBy(emailVerificationCodes.createdAt)
    .limit(1);

  const row = rows[0];
  if (!row) return false;
  if (row.expiresAt < new Date()) return false;

  // Mark as used
  await db
    .update(emailVerificationCodes)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationCodes.id, row.id));

  return true;
}

export async function markEmailVerified(email: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(emailUsers)
    .set({ updatedAt: new Date() })
    .where(eq(emailUsers.email, email.toLowerCase().trim()));
}

// ---- Password Reset Helpers ----
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  // Check user exists
  const user = await findEmailUserByEmail(email);
  if (!user) return null;
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
  await db.insert(passwordResetTokens).values({
    email: email.toLowerCase().trim(),
    token,
    expiresAt,
  });
  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return false;
  if (row.expiresAt < new Date()) return false;

  // Update password
  const passwordHash = hashPassword(newPassword);
  await db
    .update(emailUsers)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(emailUsers.email, row.email));

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));

  return true;
}

// TODO: add feature queries here as your schema grows.

// ---- Stripe Billing Helpers ----

/**
 * Get or create a Stripe customer ID for a user.
 * Returns the existing stripeCustomerId if set, otherwise null.
 */
export async function getStripeCustomerId(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ stripeCustomerId: emailUsers.stripeCustomerId })
    .from(emailUsers)
    .where(eq(emailUsers.id, userId))
    .limit(1);
  return rows[0]?.stripeCustomerId ?? null;
}

/**
 * Save Stripe customer and subscription info for a user.
 */
export async function saveStripeSubscription(
  userId: number,
  data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    stripeSubscriptionStatus?: string;
    stripeTrialEnd?: Date | null;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[DB] saveStripeSubscription: database not available");
    return;
  }
  await db
    .update(emailUsers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(emailUsers.id, userId));
}

/**
 * Get Stripe subscription info for a user.
 */
export async function getStripeSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      stripeCustomerId: emailUsers.stripeCustomerId,
      stripeSubscriptionId: emailUsers.stripeSubscriptionId,
      stripePriceId: emailUsers.stripePriceId,
      stripeSubscriptionStatus: emailUsers.stripeSubscriptionStatus,
      stripeTrialEnd: emailUsers.stripeTrialEnd,
    })
    .from(emailUsers)
    .where(eq(emailUsers.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Find a user by their Stripe customer ID (used in webhooks).
 */
export async function findUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(emailUsers)
    .where(eq(emailUsers.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return rows[0] ?? null;
}


// ---- User Awards/Badges Helpers ----
import { userAwards } from "../drizzle/schema";

/**
 * Save a user award to the database.
 * Returns true if the award was newly saved, false if it already existed.
 */
export async function saveUserAward(
  userId: number,
  award: {
    id: string;
    name: string;
    description: string;
    icon: string;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[DB] saveUserAward: database not available");
    return false;
  }

  try {
    // Check if award already exists for this user
    const existing = await db
      .select()
      .from(userAwards)
      .where(
        and(
          eq(userAwards.userId, userId),
          eq(userAwards.awardId, award.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`[DB] Award ${award.id} already exists for user ${userId}`);
      return false;
    }

    // Insert new award
    await db.insert(userAwards).values({
      userId,
      awardId: award.id,
      awardName: award.name,
      awardDescription: award.description,
      awardIcon: award.icon,
      unlockedAt: new Date(),
    });

    console.log(`[DB] Saved award ${award.id} for user ${userId}`);
    return true;
  } catch (error) {
    console.error("[DB] saveUserAward error:", error);
    return false;
  }
}

/**
 * Get all awards for a user.
 */
export async function getUserAwards(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const awards = await db
      .select()
      .from(userAwards)
      .where(eq(userAwards.userId, userId))
      .orderBy(userAwards.unlockedAt);
    return awards;
  } catch (error) {
    console.error("[DB] getUserAwards error:", error);
    return [];
  }
}

/**
 * Check if a user has a specific award.
 */
export async function hasUserAward(userId: number, awardId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const rows = await db
      .select()
      .from(userAwards)
      .where(
        and(
          eq(userAwards.userId, userId),
          eq(userAwards.awardId, awardId)
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    console.error("[DB] hasUserAward error:", error);
    return false;
  }
}
