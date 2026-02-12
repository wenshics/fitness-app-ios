import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initialCheckDone = useRef(false);

  // Core function: try to get user from API (background refresh)
  const refreshFromApi = useCallback(async () => {
    if (Platform.OS !== "web") return;
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
      }
      // If API returns null but we have a cached user, do NOT clear - the cookie might just be invalid
      // The user will be cleared only on explicit logout
    } catch (err) {
      console.warn("[useAuth] API refresh failed (keeping cached user if any):", err);
      // Don't clear user on API failure - keep cached state
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
          // Step 2: Refresh from API in background (non-blocking, won't clear user on failure)
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
      } else {
        console.log("[useAuth] Native: no cached user");
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
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

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

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
