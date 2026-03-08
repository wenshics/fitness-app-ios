import * as Auth from "@/lib/_core/auth";
import { supabase } from "@/lib/_core/supabase";
import { logoutPurchases } from "@/lib/_core/purchases";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  // Subscribe to Supabase auth state changes (fires on login, logout, token refresh)
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const user = await Auth.getUserInfo();
      emit(user, false);
    } else {
      emit(null, false);
    }
  });

  // Load the current session immediately on startup
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const user = await Auth.getUserInfo();
    emit(user, false);
  } else {
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

    const listener: Listener = (u, l) => {
      if (mountedRef.current) {
        setUser(u);
        setLoading(l);
      }
    };
    listeners.add(listener);

    // Sync with current global state immediately
    setUser(globalUser);
    setLoading(globalLoading);

    initGlobalAuth();

    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);

  /**
   * Call after a successful Supabase signIn to push user data into global state
   * immediately (before onAuthStateChange fires).
   */
  const login = useCallback(async (userData: Auth.User, _sessionToken: string) => {
    emit(userData, false);
  }, []);

  const logout = useCallback(async () => {
    emit(null, false);
    await Promise.allSettled([
      supabase.auth.signOut(),
      logoutPurchases(),
    ]);
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refresh: async () => {
      const user = await Auth.getUserInfo();
      emit(user, false);
    },
    error: null,
  };
}

/** @deprecated Use useAuth() instead. */
export function notifyAuthChanged(): void {}
