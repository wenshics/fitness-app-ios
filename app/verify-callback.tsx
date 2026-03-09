import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/_core/supabase";

/**
 * Handles Supabase auth deep link callbacks (email verification, password reset).
 * Deep links are intercepted at the AuthGuard level in _layout.tsx before Expo Router
 * can route them. This screen handles cases where Expo Router does parse the params.
 *
 * PKCE: manus20260212000221://verify-callback?code=xxx  → params.code
 * Implicit flow is handled entirely by AuthGuard in _layout.tsx.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    if (!params.code) return;
    supabase.auth.exchangeCodeForSession(params.code).then(({ error }) => {
      router.replace(error ? "/login-screen" : "/(tabs)");
    });
  }, [params.code, router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
