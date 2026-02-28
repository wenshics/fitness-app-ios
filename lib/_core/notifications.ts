import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

const SchedulableTriggerInputTypes = Notifications.SchedulableTriggerInputTypes;

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions() {
  // Skip on web platform
  if (Platform.OS === "web") {
    console.warn("[Notifications] Skipped on web platform");
    return false;
  }

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
    // Return false but don't block app initialization
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
  if (Platform.OS === "web") {
    console.warn("[Notifications] Not available on web");
    return "";
  }

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
    console.error("[Notifications] Error scheduling reminder:", error);
    throw error;
  }
}

/**
 * Schedule multiple workout reminders based on a schedule
 */
export async function scheduleWorkoutReminders(reminders: Array<{ day: string; time: string }>) {
  if (Platform.OS === "web") {
    console.warn("[Notifications] Not available on web");
    return [];
  }

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const notificationIds: string[] = [];

  for (const reminder of reminders) {
    try {
      const dayIndex = days.indexOf(reminder.day);
      if (dayIndex === -1) {
        console.warn("[Notifications] Invalid day:", reminder.day);
        continue;
      }

      const [hours, minutes] = reminder.time.split(":").map(Number);
      const now = new Date();
      const scheduledDate = new Date();

      // Calculate days until the target day
      let daysUntil = dayIndex - now.getDay();
      if (daysUntil <= 0) {
        daysUntil += 7;
      }

      scheduledDate.setDate(scheduledDate.getDate() + daysUntil);
      scheduledDate.setHours(hours, minutes, 0, 0);

      const notificationId = await scheduleWorkoutReminder(
        "Time to workout!",
        `Don't forget your ${reminder.day} workout at ${reminder.time}`,
        scheduledDate
      );

      notificationIds.push(notificationId);
    } catch (error) {
      console.error("[Notifications] Error scheduling reminder for", reminder.day, ":", error);
    }
  }

  return notificationIds;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  if (Platform.OS === "web") {
    console.warn("[Notifications] Not available on web");
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("[Notifications] Canceled all scheduled notifications");
  } catch (error) {
    console.error("[Notifications] Error canceling notifications:", error);
    throw error;
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications() {
  if (Platform.OS === "web") {
    return [];
  }

  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error("[Notifications] Error getting scheduled notifications:", error);
    return [];
  }
}

/**
 * Set up the notification handler for foreground notifications
 */
export function setupNotificationHandler() {
  if (Platform.OS === "web") {
    console.warn("[Notifications] Handler not available on web");
    return;
  }

  // Set notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  console.log("[Notifications] Handler set up");
}
