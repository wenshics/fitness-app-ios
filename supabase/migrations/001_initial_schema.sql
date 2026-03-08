-- ============================================================
-- Pulse App — Supabase (PostgreSQL) Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- OAuth users (Manus OAuth)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  "openId"      VARCHAR(64) NOT NULL UNIQUE,
  name          TEXT,
  email         VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role          TEXT NOT NULL DEFAULT 'user',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email/password users with Stripe billing fields
CREATE TABLE IF NOT EXISTS email_users (
  id                          SERIAL PRIMARY KEY,
  email                       VARCHAR(320) NOT NULL UNIQUE,
  name                        TEXT NOT NULL,
  "passwordHash"              TEXT NOT NULL,
  birthday                    VARCHAR(20),
  "heightCm"                  INTEGER,
  "weightKg"                  INTEGER,
  "stripeCustomerId"          VARCHAR(64),
  "stripeSubscriptionId"      VARCHAR(64),
  "stripePriceId"             VARCHAR(64),
  "stripeSubscriptionStatus"  VARCHAR(32),
  "stripeTrialEnd"            TIMESTAMPTZ,
  "createdAt"                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session tokens (1-year expiry)
CREATE TABLE IF NOT EXISTS email_sessions (
  id          SERIAL PRIMARY KEY,
  token       VARCHAR(128) NOT NULL UNIQUE,
  "userId"    INTEGER NOT NULL REFERENCES email_users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ NOT NULL
);

-- 6-digit email verification codes (10-minute expiry)
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(320) NOT NULL,
  code        VARCHAR(6) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Password reset tokens (1-hour expiry)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(320) NOT NULL,
  token       VARCHAR(128) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User awards / achievements
CREATE TABLE IF NOT EXISTS user_awards (
  id                  SERIAL PRIMARY KEY,
  "userId"            INTEGER NOT NULL REFERENCES email_users(id) ON DELETE CASCADE,
  "awardId"           VARCHAR(64) NOT NULL,
  "awardName"         VARCHAR(128) NOT NULL,
  "awardDescription"  TEXT,
  "awardIcon"         VARCHAR(128),
  "unlockedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "awardId")
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_email_sessions_userid  ON email_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_email_sessions_token   ON email_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_awards_userid     ON user_awards("userId");
CREATE INDEX IF NOT EXISTS idx_email_users_stripe_cid ON email_users("stripeCustomerId");
CREATE INDEX IF NOT EXISTS idx_verification_email     ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_email     ON password_reset_tokens(email);
