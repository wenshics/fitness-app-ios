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

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
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
  const token = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + ONE_YEAR_MS);
  await db.insert(emailSessions).values({ token, userId, expiresAt });
  return token;
}

export async function findEmailSessionUser(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      userId: emailSessions.userId,
      expiresAt: emailSessions.expiresAt,
      email: emailUsers.email,
      name: emailUsers.name,
    })
    .from(emailSessions)
    .innerJoin(emailUsers, eq(emailSessions.userId, emailUsers.id))
    .where(eq(emailSessions.token, token))
    .limit(1);
  if (!rows[0]) return null;
  if (rows[0].expiresAt < new Date()) return null; // expired
  return rows[0];
}

export async function deleteEmailSession(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(emailSessions).where(eq(emailSessions.token, token));
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
