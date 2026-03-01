import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as Api from "@/lib/_core/api";

/**
 * SIMPLE AUTH DESIGN:
 * - Local storage (SecureStore on native, localStorage on web) is the SINGLE SOURCE OF TRUTH
 * - On app load: read user from local storage immediately — no API calls
 * - On login/signup: store token + user info locally, set user state
 * - On logout: clear local storage, clear user state
 * - NEVER call the API to verify the session on app load — this causes redirect loops
 *   when the server restarts and loses in-memory sessions
 */

export type AuthUser = Auth.User;

/**
 * Notify all useAuth instances that the user has logged in.
 * Call this after storing user info locally.
 */
export function notifyAuthChanged(): void {
  // No-op: login-screen directly sets state via the returned setUser
  // This is kept for backward compatibility with any code that calls it
}

export function useAuth() {
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from local storage on mount — synchronous, no API calls
  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const stored = await Auth.getUserInfo();
        if (!cancelled) {
          setUser(stored);
        }
      } catch (err) {
        console.warn("[useAuth] Failed to load user from storage:", err);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (userData: Auth.User, sessionToken: string) => {
    // Store token and user info locally
    await Auth.setSessionToken(sessionToken);
    await Auth.setUserInfo(userData);
    // Update state immediately — no API call needed
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    // Clear local state immediately
    setUser(null);

    // Clear local storage
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();

    // Best-effort server logout (don't await — don't let failure block UI)
    Api.logout().catch((err) => {
      console.warn("[useAuth] Server logout failed (ignored):", err);
    });
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    // Legacy compat
    refresh: async () => {},
    error: null,
  };
}
