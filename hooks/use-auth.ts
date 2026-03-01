import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

/**
 * Custom event name used to signal that auth state has changed
 * (e.g., after OAuth callback stores user info in localStorage).
 * This allows useAuth to reactively pick up the new user without
 * requiring a page reload or second login attempt.
 */
const AUTH_CHANGED_EVENT = "auth-state-changed";

/**
 * Dispatch a custom event to notify all useAuth instances that
 * credentials have been updated. Call this after storing user info
 * in the OAuth callback.
 */
export function notifyAuthChanged(): void {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    console.log("[useAuth] Dispatching auth-state-changed event");
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
  }
}

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initialCheckDone = useRef(false);
  const isLoggedOutRef = useRef(false); // Track if user explicitly logged out

  // Core function: try to get user from API (background refresh)
  const refreshFromApi = useCallback(async () => {
    if (Platform.OS !== "web") return;
    
    // Don't restore user if they explicitly logged out
    if (isLoggedOutRef.current) {
      console.log("[useAuth] Skipping refresh - user logged out");
      return;
    }
    
    try {
      const apiUser = await Api.getMe();
      if (apiUser) {
        const userInfo: Auth.User = {
          id: apiUser.id,
          openId: apiUser.openId,
          name: apiUser.name,
          email: apiUser.email,
          loginMethod: apiUser.loginMethod,
          lastSignedIn: new Date(apiUser.lastSignedIn),
        };
        setUser(userInfo);
        await Auth.setUserInfo(userInfo);
        console.log("[useAuth] Refreshed user from API");
      } else {
        // API returned null - user is not authenticated
        console.log("[useAuth] API returned no user - clearing cached user");
        setUser(null);
        await Auth.clearUserInfo();
      }
    } catch (err) {
      console.warn("[useAuth] API refresh failed:", err);
      // On API failure, clear the user to be safe
      setUser(null);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called, platform:", Platform.OS);
    try {
      setError(null);

      if (Platform.OS === "web") {
        // Step 1: Check localStorage cache first (instant, synchronous on web)
        const cachedUser = await Auth.getUserInfo();
        if (cachedUser) {
          console.log("[useAuth] Web: found cached user in localStorage");
          setUser(cachedUser);
          setLoading(false);
          // Step 2: Refresh from API in background (non-blocking)
          refreshFromApi();
          return;
        }

        // Step 2: No cache - try API directly
        console.log("[useAuth] Web: no cached user, trying API...");
        try {
          const apiUser = await Api.getMe();
          if (apiUser) {
            const userInfo: Auth.User = {
              id: apiUser.id,
              openId: apiUser.openId,
              name: apiUser.name,
              email: apiUser.email,
              loginMethod: apiUser.loginMethod,
              lastSignedIn: new Date(apiUser.lastSignedIn),
            };
            setUser(userInfo);
            await Auth.setUserInfo(userInfo);
            console.log("[useAuth] Web: user set from API");
          } else {
            console.log("[useAuth] Web: no user from API");
            setUser(null);
          }
        } catch (apiErr) {
          console.warn("[useAuth] Web: API call failed:", apiErr);
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // Native platform: use token-based auth
      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        console.log("[useAuth] Native: no session token");
        setUser(null);
        setLoading(false);
        return;
      }

      const cachedUser = await Auth.getUserInfo();
      if (cachedUser) {
        console.log("[useAuth] Native: using cached user");
        setUser(cachedUser);
        setLoading(false);
        return;
      }

      // No cached user but have token - validate with API
      console.log("[useAuth] Native: no cached user, validating token with API...");
      try {
        const apiUser = await Api.getMe();
        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          await Auth.setUserInfo(userInfo);
          console.log("[useAuth] Native: user set from API");
        } else {
          console.log("[useAuth] Native: API returned no user, clearing token");
          await Auth.removeSessionToken();
          setUser(null);
        }
      } catch (apiErr) {
        console.warn("[useAuth] Native: API validation failed, clearing token:", apiErr);
        await Auth.removeSessionToken();
        setUser(null);
      }
      setLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
      setLoading(false);
    }
  }, [refreshFromApi]);

  const logout = useCallback(async () => {
    console.log("[useAuth] logout called");
    
    // Mark that user explicitly logged out - prevents background refresh from restoring them
    isLoggedOutRef.current = true;
    console.log("[useAuth] Set isLoggedOutRef to true");
    
    // Clear local state IMMEDIATELY - this triggers AuthGuard to redirect
    console.log("[useAuth] Clearing user state");
    setUser(null);
    setError(null);
    
    // Clear storage
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();
    console.log("[useAuth] Local state and storage cleared");
    
    // Then notify server (best effort)
    try {
      console.log("[useAuth] calling Api.logout()...");
      await Api.logout();
      console.log("[useAuth] Api.logout() succeeded");
    } catch (err) {
      console.error("[useAuth] Logout API call failed (local state already cleared):", err);
    }
    
    console.log("[useAuth] logout complete");
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  // Initial auth check on mount
  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }
    // Prevent double-call in React strict mode or re-renders
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;

    console.log("[useAuth] Initial auth check, platform:", Platform.OS);
    fetchUser();
  }, [autoFetch, fetchUser]);

  // Listen for auth-state-changed events (fired by OAuth callback after storing user)
  // This ensures useAuth picks up the new user immediately without needing a second login
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleAuthChanged = () => {
      console.log("[useAuth] Received auth-state-changed event, re-fetching user...");
      // Reset logout flag when user logs back in
      isLoggedOutRef.current = false;
      fetchUser();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    };
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
