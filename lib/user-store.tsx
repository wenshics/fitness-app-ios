import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ===== USER PROFILE TYPES =====
export interface UserProfile {
  dateOfBirth?: string; // YYYY-MM-DD format
  height?: number; // in cm
  weight?: number; // in kg
  onboardingCompleted?: boolean;
}

interface UserContextType {
  userProfile: UserProfile | null;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  clearUserProfile: () => Promise<void>;
  isLoading: boolean;
}

// ===== CONTEXT =====
const UserContext = createContext<UserContextType | undefined>(undefined);

// ===== PROVIDER =====
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from storage on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem("user_profile");
        if (stored) {
          setUserProfile(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateUserProfile = useCallback(
    async (profile: Partial<UserProfile>) => {
      try {
        // Use functional setState to avoid stale closures
        setUserProfile((prevProfile) => {
          const updated = { ...prevProfile, ...profile };
          // Save to AsyncStorage after state update
          AsyncStorage.setItem("user_profile", JSON.stringify(updated)).catch((error) => {
            console.error("Error saving to AsyncStorage:", error);
          });
          return updated;
        });
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
      }
    },
    []
  );

  const clearUserProfile = useCallback(async () => {
    try {
      setUserProfile(null);
      await AsyncStorage.removeItem("user_profile").catch((error) => {
        console.error("Error removing from AsyncStorage:", error);
      });
    } catch (error) {
      console.error("Error clearing user profile:", error);
      throw error;
    }
  }, []);

  const contextValue = React.useMemo(
    () => ({ userProfile, updateUserProfile, clearUserProfile, isLoading }),
    [userProfile, updateUserProfile, clearUserProfile, isLoading]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

// ===== HOOK =====
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
