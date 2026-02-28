import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

const SchedulableTriggerInputTypes = Notifications.SchedulableTriggerInputTypes;

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions() {
  if (!Device.isDevice) {
    console.warn("[Notifications] Running on simulator, notifications may not work");
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[Notifications] Permission denied");
      return false;
    }

    console.log("[Notifications] Permission granted");
    return true;
  } catch (error) {
    console.error("[Notifications] Permission request failed:", error);
    return false;
  }
}

/**
 * Schedule a local notification for a workout reminder
 */
export async function scheduleWorkoutReminder(
  title: string,
  body: string,
  scheduledTime: Date
) {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        badge: 1,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.floor((scheduledTime.getTime() - Date.now()) / 1000)),
      },
    });

    console.log("[Notifications] Scheduled reminder:", notificationId);
    return notificationId;
  } catch (error) {
    console.error("[Notifications] Schedule failed:", error);
    throw error;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log("[Notifications] Cancelled:", notificationId);
  } catch (error) {
    console.error("[Notifications] Cancel failed:", error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("[Notifications] Cancelled all notifications");
  } catch (error) {
    console.error("[Notifications] Cancel all failed:", error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error("[Notifications] Get scheduled failed:", error);
    return [];
  }
}

/**
 * Set up notification handler for when app is in foreground
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Handle notification when user taps it
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("[Notifications] User tapped notification:", response.notification.request.content.title);
    // Could navigate to specific screen here
  });

  return subscription;
}

/**
 * Schedule daily workout reminders based on user preferences
 * Format: reminders = [{ day: "Monday", time: "07:00" }, { day: "Wednesday", time: "18:30" }]
 */
export async function scheduleWorkoutReminders(reminders: Array<{ day: string; time: string }>) {
  try {
    // Cancel existing reminders
    await cancelAllNotifications();

    const now = new Date();
    const scheduledIds: string[] = [];

    for (const reminder of reminders) {
      const [hours, minutes] = reminder.time.split(":").map(Number);
      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (reminderDate < now) {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }

      try {
        const notificationId = await scheduleWorkoutReminder(
          "Time to workout!",
          `It's time for your daily exercise routine. Let's get started!`,
          reminderDate
        );

        scheduledIds.push(notificationId);
      } catch (error) {
        console.error(`[Notifications] Failed to schedule reminder for ${reminder.day} at ${reminder.time}:`, error);
      }
    }

    console.log("[Notifications] Scheduled", scheduledIds.length, "reminders");
    return scheduledIds;
  } catch (error) {
    console.error("[Notifications] Schedule reminders failed:", error);
    throw error;
  }
}
