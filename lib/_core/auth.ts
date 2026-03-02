import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY, ONBOARDING_COMPLETED_KEY } from "@/constants/oauth";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
  birthday?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

export async function getSessionToken(): Promise<string | null> {
  try {
    // Web platform uses cookie-based auth, no manual token management needed
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token retrieval");
      return null;
    }

    // Use SecureStore for native
    console.log("[Auth] Getting session token...");
    const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    console.log(
      "[Auth] Session token retrieved from SecureStore:",
      token ? `present (${token.substring(0, 20)}...)` : "missing",
    );
    return token;
  } catch (error) {
    console.error("[Auth] Failed to get session token:", error);
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    // Web platform uses cookie-based auth, no manual token management needed
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token storage");
      return;
    }

    // Use SecureStore for native
    console.log("[Auth] Setting session token...", token.substring(0, 20) + "...");
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    console.log("[Auth] Session token stored in SecureStore successfully");
  } catch (error) {
    console.error("[Auth] Failed to set session token:", error);
    throw error;
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    // Web platform uses cookie-based auth, logout is handled by server clearing cookie
    if (Platform.OS === "web") {
      console.log("[Auth] Web platform uses cookie-based auth, skipping token removal");
      return;
    }

    // Use SecureStore for native
    console.log("[Auth] Removing session token...");
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    console.log("[Auth] Session token removed from SecureStore successfully");
  } catch (error) {
    console.error("[Auth] Failed to remove session token:", error);
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    console.log("[Auth] Getting user info...");

    let info: string | null = null;
    if (Platform.OS === "web") {
      // Use localStorage for web
      info = window.localStorage.getItem(USER_INFO_KEY);
    } else {
      // Use SecureStore for native
      info = await SecureStore.getItemAsync(USER_INFO_KEY);
    }

    if (!info) {
      console.log("[Auth] No user info found");
      return null;
    }
    const user = JSON.parse(info);
    console.log("[Auth] User info retrieved:", user);
    return user;
  } catch (error) {
    console.error("[Auth] Failed to get user info:", error);
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    console.log("[Auth] Setting user info...", user);

    if (Platform.OS === "web") {
      // Use localStorage for web
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
      console.log("[Auth] User info stored in localStorage successfully");
      return;
    }

    // Use SecureStore for native
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    console.log("[Auth] User info stored in SecureStore successfully");
  } catch (error) {
    console.error("[Auth] Failed to set user info:", error);
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      // Use localStorage for web
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }

    // Use SecureStore for native
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch (error) {
    console.error("[Auth] Failed to clear user info:", error);
  }
}


export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    console.log("[Auth] Checking if onboarding completed...");
    let completed: string | null = null;
    
    if (Platform.OS === "web") {
      completed = window.localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    } else {
      completed = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
    }
    
    const result = completed === "true";
    console.log("[Auth] Onboarding completed:", result);
    return result;
  } catch (error) {
    console.error("[Auth] Failed to check onboarding status:", error);
    return false;
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  try {
    console.log("[Auth] Marking onboarding as completed...");
    
    if (Platform.OS === "web") {
      window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    } else {
      await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, "true");
    }
    
    console.log("[Auth] Onboarding marked as completed");
  } catch (error) {
    console.error("[Auth] Failed to mark onboarding completed:", error);
  }
}

export async function clearOnboardingFlag(): Promise<void> {
  try {
    console.log("[Auth] Clearing onboarding flag...");
    
    if (Platform.OS === "web") {
      window.localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    } else {
      await SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY);
    }
    
    console.log("[Auth] Onboarding flag cleared");
  } catch (error) {
    console.error("[Auth] Failed to clear onboarding flag:", error);
  }
}
