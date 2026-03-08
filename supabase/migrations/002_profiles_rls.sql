-- ─────────────────────────────────────────────────────────────────────────────
-- 002_profiles_rls.sql
-- Profiles table (linked to Supabase auth.users) + user_awards with UUID FK
-- RLS policies for direct client access (no server required)
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Profiles table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  birthday    VARCHAR(20),
  height_cm   NUMERIC,
  weight_kg   NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── user_awards table (UUID version) ─────────────────────────────────────────
-- Drop the old INTEGER-based table and recreate with UUID foreign key
DROP TABLE IF EXISTS public.user_awards CASCADE;

CREATE TABLE public.user_awards (
  id                SERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  award_id          VARCHAR(64) NOT NULL,
  award_name        VARCHAR(128) NOT NULL,
  award_description TEXT,
  award_icon        VARCHAR(128),
  unlocked_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, award_id)
);

-- Enable RLS
ALTER TABLE public.user_awards ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own awards
DROP POLICY IF EXISTS "user_awards_select_own" ON public.user_awards;
CREATE POLICY "user_awards_select_own"
  ON public.user_awards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_awards_insert_own" ON public.user_awards;
CREATE POLICY "user_awards_insert_own"
  ON public.user_awards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_awards_update_own" ON public.user_awards;
CREATE POLICY "user_awards_update_own"
  ON public.user_awards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Auto-update updated_at on profiles ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Auto-create profile on signup ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
