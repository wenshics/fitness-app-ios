import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { useAuth } from "@/hooks/use-auth";
import { useAwardSync } from "@/hooks/use-award-sync";
import { WorkoutProvider, useWorkout } from "@/lib/workout-store";
import { SubscriptionProvider, useSubscription } from "@/lib/subscription-store";
import { UserProvider } from "@/lib/user-store";
import { AuthModalProvider } from "@/lib/auth-modal-context";
import { setupNotificationHandler, requestNotificationPermissions } from "@/lib/_core/notifications";
import { initializePurchases } from "@/lib/_core/purchases";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/_core/supabase";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

/**
 * Wraps UserProvider with the current authenticated user's ID and server user
 * data so that profile data is scoped per account and auto-seeded from the
 * server on first login.  Must be rendered inside AuthProvider.
 */
function UserProviderWithAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <UserProvider
      userId={user?.id ?? null}
      serverUser={user ?? null}
    >
      {children}
    </UserProvider>
  );
}

/**
 * Syncs user ID to subscription and workout stores so data is scoped per user.
 * This component must be rendered inside both providers AND have access to useAuth.
 */
function UserDataSync({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { setUserId: setSubUserId } = useSubscription();
  const { setUserId: setWorkoutUserId } = useWorkout();

  // Sync awards to backend when user logs in
  useAwardSync();
  useEffect(() => {
    const userId = user?.id ?? null;
    console.log("[UserDataSync] User changed:", userId, "isAuthenticated:", isAuthenticated);
    setSubUserId(userId);
    setWorkoutUserId(userId);
  }, [user?.id, isAuthenticated, setSubUserId, setWorkoutUserId]);

  return <>{children}</>;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // Track whether we've done the initial redirect so we don't loop
  const hasRedirected = useRef(false);

  // Handle Supabase auth deep links at root level — bypasses Expo Router route matching
  useEffect(() => {
    const handleAuthUrl = async (url: string) => {
      if (!url.includes("manus20260212000221://")) return;

      // PKCE: ?code=xxx
      const qs = url.split("?")[1]?.split("#")[0] ?? "";
      const code = new URLSearchParams(qs).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) router.replace("/(tabs)");
        return;
      }

      // Implicit: #access_token=xxx
      const fragment = url.split("#")[1] ?? "";
      const fp = new URLSearchParams(fragment);
      const accessToken = fp.get("access_token");
      const refreshToken = fp.get("refresh_token");
      const type = fp.get("type");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        router.replace(type === "recovery" ? "/reset-password" : "/(tabs)");
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleAuthUrl(url); });
    const sub = Linking.addEventListener("url", ({ url }) => handleAuthUrl(url));
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    // Wait until auth finishes loading from local storage
    if (isLoading) return;

    const inAuthGroup =
      segments[0] === "oauth" ||
      segments[0] === "auth" ||
      segments[0] === "verify-callback" ||
      segments[0] === "login-screen" ||
      segments[0] === "signup-screen" ||
      segments[0] === "verify-email" ||
      segments[0] === "forgot-password" ||
      segments[0] === "reset-password";

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in and not already on an auth screen — go to login
      router.replace("/login-screen");
    } else if (isAuthenticated && inAuthGroup) {
      // Just logged in and still on auth screen — go to home
      // Only do this once per session to avoid looping
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        router.replace("/(tabs)");
      }
    } else {
      // Correct screen for auth state — reset redirect flag
      hasRedirected.current = false;
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  // Initialize notifications and RevenueCat (non-blocking)
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setupNotificationHandler();
        console.log("[RootLayout] Notification handler set up");
      } catch (error) {
        console.error("[RootLayout] Error setting up notifications:", error);
      }
      
      try {
        const hasPermission = await requestNotificationPermissions();
        console.log("[RootLayout] Notification permission:", hasPermission);
      } catch (error) {
        console.error("[RootLayout] Error requesting permission:", error);
      }
      
      try {
        await initializePurchases();
        console.log("[RootLayout] RevenueCat initialized");
      } catch (error) {
        console.error("[RootLayout] Error initializing RevenueCat:", error);
      }
    };
    
    initializeServices();
  }, []);


  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthModalProvider>
            <UserProviderWithAuth>
              <SubscriptionProvider>
                <WorkoutProvider>
                  <UserDataSync>
                  <AuthGuard>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="login" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="login-screen" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="signup-screen" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="verify-callback" />
                    <Stack.Screen name="verify-email" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="forgot-password" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="reset-password" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal", gestureEnabled: true }} />
                    <Stack.Screen name="oauth/callback" />
                    <Stack.Screen
                      name="exercise/[id]"
                      options={{ presentation: "modal", gestureEnabled: true }}
                    />
                    <Stack.Screen
                      name="workout-session"
                      options={{ presentation: "fullScreenModal", gestureEnabled: false }}
                    />
                  </Stack>
                </AuthGuard>
              </UserDataSync>
            </WorkoutProvider>
          </SubscriptionProvider>
            </UserProviderWithAuth>
          </AuthModalProvider>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
