/**
 * Auth core — backed by Supabase Auth.
 *
 * Session tokens are managed by the Supabase SDK (stored in AsyncStorage on
 * native, localStorage on web). We expose the same interface as before so
 * the rest of the app doesn't need to change.
 */
import { supabase } from "./supabase";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { ONBOARDING_COMPLETED_KEY } from "@/constants/oauth";

export type User = {
  id: string; // Supabase UUID
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
  birthday?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

// ── Session token ─────────────────────────────────────────────────────────────

export async function getSessionToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** No-op: Supabase manages its own session storage. */
export async function setSessionToken(_token: string): Promise<void> {}

export async function removeSessionToken(): Promise<void> {
  await supabase.auth.signOut();
}

// ── User info ─────────────────────────────────────────────────────────────────

export async function getUserInfo(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const supabaseUser = session.user;

  // Fetch extra profile data from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, birthday, height_cm, weight_kg")
    .eq("id", supabaseUser.id)
    .single();

  return {
    id: supabaseUser.id,
    openId: supabaseUser.id,
    email: supabaseUser.email ?? null,
    name: profile?.name ?? (supabaseUser.user_metadata?.name as string) ?? null,
    loginMethod: "email",
    lastSignedIn: new Date(supabaseUser.last_sign_in_at ?? Date.now()),
    birthday: profile?.birthday ?? null,
    heightCm: profile?.height_cm ?? null,
    weightKg: profile?.weight_kg ?? null,
  };
}

/** No-op: Supabase manages sessions. Kept for backward compatibility. */
export async function setUserInfo(_user: User): Promise<void> {}
export async function clearUserInfo(): Promise<void> {}

// ── Onboarding flag ───────────────────────────────────────────────────────────

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
    }
    const val = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    } else {
      await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, "true");
    }
  } catch (err) {
    console.error("[Auth] markOnboardingCompleted error:", err);
  }
}

export async function clearOnboardingFlag(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    } else {
      await SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY);
    }
  } catch (err) {
    console.error("[Auth] clearOnboardingFlag error:", err);
  }
}
