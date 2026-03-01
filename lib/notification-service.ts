import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ReminderSettings } from './workout-store';

/**
 * Notification Service
 * Handles scheduling and managing push notifications for workout reminders
 */

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initialize notifications - request permissions and set up listeners
 */
export async function initializeNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Skipping on web platform');
      return false;
    }

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';

    if (granted) {
      console.log('[Notifications] Permissions granted');
    } else {
      console.log('[Notifications] Permissions denied');
    }

    return granted;
  } catch (error) {
    console.error('[Notifications] Initialization error:', error);
    return false;
  }
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Check if a date is a weekday (Monday-Friday)
 */
function isWeekday(date: Date): boolean {
  const day = getDayOfWeek(date);
  return day >= 1 && day <= 5; // Monday to Friday
}

/**
 * Check if a date is a weekend (Saturday-Sunday)
 */
function isWeekend(date: Date): boolean {
  const day = getDayOfWeek(date);
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Schedule a single reminder notification
 */
async function scheduleReminder(
  identifier: string,
  title: string,
  body: string,
  hour: number,
  minute: number,
  daysOfWeek: number[] // 0 = Sunday, 1 = Monday, etc.
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      console.log(`[Notifications] Skipping schedule on web: ${identifier}`);
      return null;
    }

    // Cancel existing notification with this identifier
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

    // Create trigger for the specific days and time
    // Use daily trigger at specific time for recurring reminders
    const trigger: any = {
      type: 'daily',
      hour,
      minute,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        badge: 1,
      },
      trigger: trigger as any,
      identifier,
    });

    console.log(`[Notifications] Scheduled ${identifier}: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error(`[Notifications] Error scheduling ${identifier}:`, error);
    return null;
  }
}

/**
 * Schedule all reminders based on ReminderSettings
 */
export async function scheduleAllReminders(reminders: ReminderSettings): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Skipping scheduling on web');
      return;
    }

    // Cancel all existing reminders first
    await cancelAllReminders();

    // Schedule weekday evening reminder (Monday-Friday)
    await scheduleReminder(
      'reminder-weekday-evening',
      'Time for your workout!',
      'Your evening workout is ready. Let\'s get moving!',
      reminders.weekdayEvening.hour,
      reminders.weekdayEvening.minute,
      [1, 2, 3, 4, 5] // Monday to Friday
    );

    // Schedule weekend morning reminder (Saturday-Sunday)
    await scheduleReminder(
      'reminder-weekend-morning',
      'Good morning! Ready to exercise?',
      'Start your weekend with a great workout!',
      reminders.weekendMorning.hour,
      reminders.weekendMorning.minute,
      [0, 6] // Sunday and Saturday
    );

    // Schedule weekend evening reminder (Saturday-Sunday)
    await scheduleReminder(
      'reminder-weekend-evening',
      'Evening workout time!',
      'Finish your weekend strong with a workout!',
      reminders.weekendEvening.hour,
      reminders.weekendEvening.minute,
      [0, 6] // Sunday and Saturday
    );

    console.log('[Notifications] All reminders scheduled successfully');
  } catch (error) {
    console.error('[Notifications] Error scheduling all reminders:', error);
  }
}

/**
 * Cancel all scheduled reminders
 */
export async function cancelAllReminders(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Skipping cancellation on web');
      return;
    }

    const reminders = [
      'reminder-weekday-evening',
      'reminder-weekend-morning',
      'reminder-weekend-evening',
    ];

    for (const identifier of reminders) {
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    }

    console.log('[Notifications] All reminders cancelled');
  } catch (error) {
    console.error('[Notifications] Error cancelling reminders:', error);
  }
}

/**
 * Cancel a specific reminder
 */
export async function cancelReminder(identifier: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      console.log(`[Notifications] Skipping cancellation on web: ${identifier}`);
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    console.log(`[Notifications] Cancelled reminder: ${identifier}`);
  } catch (error) {
    console.error(`[Notifications] Error cancelling ${identifier}:`, error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<any[]> {
  try {
    if (Platform.OS === 'web') {
      return [];
    }

    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Check if reminders are currently scheduled
 */
export async function areRemindersScheduled(): Promise<boolean> {
  try {
    const scheduled = await getScheduledNotifications();
    return scheduled.some(
      (n) =>
        n.identifier?.startsWith('reminder-') ||
        n.identifier === 'reminder-weekday-evening' ||
        n.identifier === 'reminder-weekend-morning' ||
        n.identifier === 'reminder-weekend-evening'
    );
  } catch (error) {
    console.error('[Notifications] Error checking scheduled reminders:', error);
    return false;
  }
}
