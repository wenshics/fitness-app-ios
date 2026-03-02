import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ===== USER PROFILE TYPES =====
export interface UserProfile {
  dateOfBirth?: string; // YYYY-MM-DD format
  height?: number; // in cm
  weight?: number; // in kg
  onboardingCompleted?: boolean;
}

/** Minimal shape of the server User object we need for seeding */
export interface ServerUserSeed {
  birthday?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

interface UserContextType {
  userProfile: UserProfile | null;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  clearUserProfile: () => Promise<void>;
  isLoading: boolean;
}

// ===== CONTEXT =====
const UserContext = createContext<UserContextType | undefined>(undefined);

// ===== HELPERS =====
/**
 * Returns a per-user AsyncStorage key so that different accounts on the same
 * device never share profile data.  Falls back to the legacy key when userId
 * is absent so existing data for anonymous / pre-auth sessions is preserved.
 */
function profileKey(userId?: string | number | null): string {
  return userId ? `user_profile_${userId}` : "user_profile";
}

// ===== PROVIDER =====
interface UserProviderProps {
  children: React.ReactNode;
  /** The ID of the currently authenticated user.  Pass null/undefined when
   *  the user is logged out so the provider clears its in-memory state. */
  userId?: string | number | null;
  /**
   * The full server User object returned at login.  When provided, its
   * birthday / heightCm / weightKg are used to seed the local profile if
   * the stored profile doesn't already have those values.
   */
  serverUser?: ServerUserSeed | null;
}

export function UserProvider({ children, userId, serverUser }: UserProviderProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reload profile whenever the logged-in user changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const loadProfile = async () => {
      try {
        if (!userId) {
          // No user logged in — clear in-memory state
          if (!cancelled) {
            setUserProfile(null);
            setIsLoading(false);
          }
          return;
        }

        const key = profileKey(userId);
        const stored = await AsyncStorage.getItem(key);
        const localProfile: UserProfile = stored ? JSON.parse(stored) : {};

        // Seed from server data if local profile is missing these fields
        let seeded = false;
        if (serverUser) {
          if (!localProfile.dateOfBirth && serverUser.birthday) {
            localProfile.dateOfBirth = serverUser.birthday;
            seeded = true;
          }
          if (!localProfile.height && serverUser.heightCm) {
            localProfile.height = serverUser.heightCm;
            seeded = true;
          }
          if (!localProfile.weight && serverUser.weightKg) {
            localProfile.weight = serverUser.weightKg;
            seeded = true;
          }
        }

        // Persist back if we seeded new values
        if (seeded) {
          await AsyncStorage.setItem(key, JSON.stringify(localProfile)).catch((e) =>
            console.error("[UserStore] Error persisting seeded profile:", e)
          );
        }

        if (!cancelled) {
          // Only set if there's actual data, otherwise null so "Not set" shows correctly
          const hasData =
            localProfile.dateOfBirth || localProfile.height || localProfile.weight || localProfile.onboardingCompleted;
          setUserProfile(hasData ? localProfile : null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[UserStore] Error loading user profile:", error);
        if (!cancelled) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId, serverUser]);

  const updateUserProfile = useCallback(
    async (profile: Partial<UserProfile>) => {
      try {
        const key = profileKey(userId);
        setUserProfile((prevProfile) => {
          const updated = { ...prevProfile, ...profile };
          AsyncStorage.setItem(key, JSON.stringify(updated)).catch((error) => {
            console.error("[UserStore] Error saving to AsyncStorage:", error);
          });
          return updated;
        });
      } catch (error) {
        console.error("[UserStore] Error updating user profile:", error);
        throw error;
      }
    },
    [userId]
  );

  const clearUserProfile = useCallback(async () => {
    try {
      const key = profileKey(userId);
      setUserProfile(null);
      await AsyncStorage.removeItem(key).catch((error) => {
        console.error("[UserStore] Error removing from AsyncStorage:", error);
      });
    } catch (error) {
      console.error("[UserStore] Error clearing user profile:", error);
      throw error;
    }
  }, [userId]);

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
