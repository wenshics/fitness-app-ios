import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Api from "@/lib/_core/api";

/**
 * GLOBAL AUTH STATE DESIGN:
 * - Single shared state across ALL components via module-level singleton
 * - Initialized lazily on first useAuth() mount (inside React lifecycle)
 * - login() updates the shared state immediately — no race conditions between
 *   LoginScreen and AuthGuard because they share the same globalUser reference
 * - All useAuth() calls subscribe to the same event emitter
 */

export type AuthUser = Auth.User;

// ─── Module-level singleton ───────────────────────────────────────────────────

type Listener = (user: Auth.User | null, loading: boolean) => void;
const listeners = new Set<Listener>();

let globalUser: Auth.User | null = null;
let globalLoading = true;
let initStarted = false;

function emit(user: Auth.User | null, loading: boolean) {
  globalUser = user;
  globalLoading = loading;
  listeners.forEach((l) => l(user, loading));
}

async function initGlobalAuth() {
  if (initStarted) return;
  initStarted = true;
  try {
    const stored = await Auth.getUserInfo();
    emit(stored, false);
  } catch {
    emit(null, false);
  }
}

// ─── useAuth hook ─────────────────────────────────────────────────────────────

export function useAuth() {
  const [user, setUser] = useState<Auth.User | null>(globalUser);
  const [loading, setLoading] = useState(globalLoading);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe to global state changes
    const listener: Listener = (u, l) => {
      if (mountedRef.current) {
        setUser(u);
        setLoading(l);
      }
    };
    listeners.add(listener);

    // Sync with current global state immediately (in case it changed before subscribe)
    setUser(globalUser);
    setLoading(globalLoading);

    // Start initialization if not already started (safe to call multiple times)
    initGlobalAuth();

    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);

  const login = useCallback(async (userData: Auth.User, sessionToken: string) => {
    // Store locally first
    await Auth.setSessionToken(sessionToken);
    await Auth.setUserInfo(userData);
    // Update ALL useAuth instances immediately — AuthGuard sees this right away
    emit(userData, false);
  }, []);

  const logout = useCallback(async () => {
    // Update global state immediately so AuthGuard redirects right away
    emit(null, false);

    // Clear local storage
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();

    // Best-effort server logout (don't block UI)
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
    refresh: async () => {},
    error: null,
  };
}

/**
 * @deprecated Use useAuth() instead. Kept for backward compatibility.
 */
export function notifyAuthChanged(): void {
  // No-op: login() now updates global state directly
}
