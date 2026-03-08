import { useEffect, useRef } from "react";
import { useAuth } from "./use-auth";
import { useWorkout } from "@/lib/workout-store";
import { saveAwardToBackend } from "@/lib/awards-api";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Hook to sync newly unlocked awards with the backend database.
 * Call this in your main app layout after user logs in.
 */
export function useAwardSync() {
  const { user } = useAuth();
  const { state: workoutState } = useWorkout();
  const syncedAwardsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !workoutState.loaded) {
      return;
    }

    const syncNewAwards = async () => {
      try {
        // Find newly unlocked awards (not yet synced)
        const newAwards = workoutState.unlockedAwards.filter(
          (awardId) => !syncedAwardsRef.current.has(awardId)
        );

        if (newAwards.length === 0) {
          return;
        }

        console.log(`[AwardSync] Syncing ${newAwards.length} new awards`);

        // Import AWARDS here to avoid circular dependencies
        const { AWARDS } = await import("@/lib/workout-store");

        // Sync each new award
        for (const awardId of newAwards) {
          const award = AWARDS.find((a) => a.id === awardId);
          if (award) {
            const success = await saveAwardToBackend(award);
            if (success) {
              syncedAwardsRef.current.add(awardId);
              console.log(`[AwardSync] Successfully synced award: ${awardId}`);
            }
          }
        }

        // Save synced awards to storage for persistence
        await AsyncStorage.setItem(
          `synced_awards_${user.id}`,
          JSON.stringify(Array.from(syncedAwardsRef.current))
        );
      } catch (error) {
        console.error("[AwardSync] Error syncing awards:", error);
      }
    };

    // Load previously synced awards from storage
    const loadSyncedAwards = async () => {
      try {
        const stored = await AsyncStorage.getItem(`synced_awards_${user.id}`);
        if (stored) {
          syncedAwardsRef.current = new Set(JSON.parse(stored));
        }
      } catch (error) {
        console.error("[AwardSync] Error loading synced awards:", error);
      }
    };

    loadSyncedAwards();
    syncNewAwards();
  }, [user, workoutState.unlockedAwards, workoutState.loaded]);
}
