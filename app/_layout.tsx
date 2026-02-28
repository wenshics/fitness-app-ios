import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { WorkoutProvider, useWorkout } from "@/lib/workout-store";
import { SubscriptionProvider, useSubscription } from "@/lib/subscription-store";
import { setupNotificationHandler, requestNotificationPermissions } from "@/lib/_core/notifications";
import { initializeStripe } from "@/lib/_core/stripe-payment";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

/**
 * Syncs user ID to subscription and workout stores so data is scoped per user.
 * This component must be rendered inside both providers AND have access to useAuth.
 */
function UserDataSync({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { setUserId: setSubUserId } = useSubscription();
  const { setUserId: setWorkoutUserId } = useWorkout();

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
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Wait for router to be ready and auth to finish loading
    if (isLoading) {
      console.log("[AuthGuard] Still loading, waiting...");
      return;
    }

    const inAuthGroup = segments[0] === "oauth" || segments[0] === "login";
    const currentPath = segments.join("/");

    console.log("[AuthGuard] Auth state check:", {
      isAuthenticated,
      inAuthGroup,
      currentPath,
      redirectedRef: redirectedRef.current,
    });

    // Prevent double redirects
    if (redirectedRef.current) {
      console.log("[AuthGuard] Already redirected, skipping");
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in and not on auth page → go to login
      console.log("[AuthGuard] Redirecting to login");
      redirectedRef.current = true;
      router.replace("/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but on auth page → go to app
      console.log("[AuthGuard] Redirecting to app");
      redirectedRef.current = true;
      router.replace("/(tabs)");
    } else {
      console.log("[AuthGuard] No redirect needed");
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

  // Initialize notifications and Stripe
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Set up notification handler for foreground notifications
        setupNotificationHandler();
        
        // Request notification permissions
        const hasPermission = await requestNotificationPermissions();
        console.log("[RootLayout] Notification permission granted:", hasPermission);
        
        // Initialize Stripe for payment processing
        await initializeStripe();
        console.log("[RootLayout] Stripe initialized");
      } catch (error) {
        console.error("[RootLayout] Error initializing services:", error);
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
          <SubscriptionProvider>
            <WorkoutProvider>
              <UserDataSync>
                <AuthGuard>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="login" options={{ presentation: "fullScreenModal" }} />
                    <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal", gestureEnabled: true }} />
                    <Stack.Screen name="payment-info" options={{ presentation: "fullScreenModal", gestureEnabled: true }} />
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
