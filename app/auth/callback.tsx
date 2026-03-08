import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/_core/supabase";

/**
 * Handles Supabase auth deep link callbacks (email verification, password reset).
 * Supabase redirects to: manus20260212000221://auth/callback#access_token=...
 */
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      // Extract the fragment (#access_token=...&refresh_token=...&type=...)
      const fragment = url.split("#")[1];
      if (!fragment) {
        router.replace("/login-screen");
        return;
      }

      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

        if (type === "recovery") {
          // Password reset flow → go to reset screen
          router.replace("/reset-password");
        } else {
          // Email verification or magic link → go to home
          router.replace("/(tabs)");
        }
      } else {
        router.replace("/login-screen");
      }
    };

    // Handle the URL that launched the app
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Handle URLs while app is open
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
