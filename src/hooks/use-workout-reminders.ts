import { useCallback, useEffect, useRef, useState } from "react";
import { scheduleWorkoutReminders, cancelAllNotifications, getScheduledNotifications } from "@/lib/_core/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ReminderSchedule {
  day: string;
  time: string; // Format: "HH:MM" (24-hour)
}

const REMINDERS_STORAGE_KEY = "pulse_workout_reminders";

/**
 * Hook for managing workout reminders
 * Schedules local notifications based on user preferences
 */
export function useWorkoutReminders() {
  const [reminders, setReminders] = useState<ReminderSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scheduledIdsRef = useRef<string[]>([]);

  // Load reminders from storage on mount
  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ReminderSchedule[];
        setReminders(parsed);
        setError(null);
      } else {
        // Set default reminders if none exist
        const defaultReminders: ReminderSchedule[] = [
          { day: "Monday", time: "07:00" },
          { day: "Wednesday", time: "18:30" },
          { day: "Friday", time: "07:00" },
          { day: "Sunday", time: "09:00" },
        ];
        setReminders(defaultReminders);
        await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(defaultReminders));
      }
    } catch (err) {
      console.error("[useWorkoutReminders] Error loading reminders:", err);
      setError(err instanceof Error ? err.message : "Failed to load reminders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateReminders = useCallback(
    async (newReminders: ReminderSchedule[]) => {
      try {
        setIsLoading(true);
        setReminders(newReminders);
        await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(newReminders));
        setError(null);
      } catch (err) {
        console.error("[useWorkoutReminders] Error updating reminders:", err);
        setError(err instanceof Error ? err.message : "Failed to update reminders");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const scheduleReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("[useWorkoutReminders] Scheduling reminders:", reminders);
      
      // Cancel any existing scheduled notifications
      await cancelAllNotifications();
      
      // Schedule new reminders
      const ids = await scheduleWorkoutReminders(reminders);
      scheduledIdsRef.current = ids;
      
      console.log("[useWorkoutReminders] Scheduled", ids.length, "reminders");
      setError(null);
    } catch (err) {
      console.error("[useWorkoutReminders] Error scheduling reminders:", err);
      setError(err instanceof Error ? err.message : "Failed to schedule reminders");
    } finally {
      setIsLoading(false);
    }
  }, [reminders]);

  const cancelReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      await cancelAllNotifications();
      scheduledIdsRef.current = [];
      setError(null);
    } catch (err) {
      console.error("[useWorkoutReminders] Error canceling reminders:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel reminders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getScheduled = useCallback(async () => {
    try {
      const scheduled = await getScheduledNotifications();
      return scheduled;
    } catch (err) {
      console.error("[useWorkoutReminders] Error getting scheduled notifications:", err);
      return [];
    }
  }, []);

  const addReminder = useCallback(
    async (reminder: ReminderSchedule) => {
      const updated = [...reminders, reminder];
      await updateReminders(updated);
    },
    [reminders, updateReminders]
  );

  const removeReminder = useCallback(
    async (index: number) => {
      const updated = reminders.filter((_, i) => i !== index);
      await updateReminders(updated);
    },
    [reminders, updateReminders]
  );

  const updateReminder = useCallback(
    async (index: number, reminder: ReminderSchedule) => {
      const updated = reminders.map((r, i) => (i === index ? reminder : r));
      await updateReminders(updated);
    },
    [reminders, updateReminders]
  );

  return {
    reminders,
    isLoading,
    error,
    loadReminders,
    updateReminders,
    scheduleReminders,
    cancelReminders,
    getScheduled,
    addReminder,
    removeReminder,
    updateReminder,
  };
}
