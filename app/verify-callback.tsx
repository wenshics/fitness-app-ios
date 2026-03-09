import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/_core/supabase";

/**
 * Handles Supabase auth deep link callbacks (email verification, password reset).
 * Supabase redirects to: manus20260212000221://auth/callback?code=xxx  (PKCE)
 *                     or: manus20260212000221://auth/callback#access_token=xxx  (implicit)
 *
 * Expo Router parses query params and passes them here via useLocalSearchParams.
 * Fragment (#) params are NOT parsed by Expo Router, so we also listen via Linking.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  // Expo Router gives us query params directly — most reliable for PKCE flow
  const params = useLocalSearchParams<{ code?: string; type?: string }>();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      // PKCE: ?code=xxx (also handled below via params, but kept as fallback)
      const queryString = url.split("?")[1]?.split("#")[0] ?? "";
      const queryParams = new URLSearchParams(queryString);
      const code = queryParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        router.replace(error ? "/login-screen" : "/(tabs)");
        return;
      }

      // Implicit flow: #access_token=xxx (fragment not parsed by Expo Router)
      const fragment = url.split("#")[1] ?? "";
      const fragmentParams = new URLSearchParams(fragment);
      const accessToken = fragmentParams.get("access_token");
      const refreshToken = fragmentParams.get("refresh_token");
      const type = fragmentParams.get("type");

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        router.replace(type === "recovery" ? "/reset-password" : "/(tabs)");
      } else {
        router.replace("/login-screen");
      }
    };

    // Primary: use Expo Router's already-parsed query params (PKCE flow)
    if (params.code) {
      supabase.auth.exchangeCodeForSession(params.code).then(({ error }) => {
        router.replace(error ? "/login-screen" : "/(tabs)");
      });
      return;
    }

    // Fallback: parse URL manually for implicit flow or if params aren't populated yet
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [params.code, router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
