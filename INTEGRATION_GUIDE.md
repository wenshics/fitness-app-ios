# FitLife Integration Guide: Stripe & Notifications

This guide documents the integration of Stripe payment processing and Expo Notifications for the FitLife fitness app.

## Overview

FitLife now includes two critical features for production readiness:

1. **Stripe Payment Processing** - Real credit card payment processing for subscription purchases
2. **Push Notifications** - Local and remote workout reminders

## Stripe Payment Integration

### Setup

1. **Environment Variables**
   - Add your Stripe publishable key to your `.env` file:
     ```
     EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
     ```
   - The key is automatically initialized when the app starts

2. **Payment Flow**
   - User selects a subscription plan on the paywall
   - User navigates to payment-info screen
   - User enters card details (number, cardholder name, expiry, CVV)
   - Payment is processed via `processSubscriptionPayment()` function
   - On success, user is subscribed and redirected to the home screen

### Key Files

| File | Purpose |
|------|---------|
| `lib/_core/stripe-payment.ts` | Core Stripe payment functions |
| `app/payment-info.tsx` | Payment form UI and validation |
| `server/_core/payments.ts` | Backend payment API endpoints |

### API Functions

#### `initializeStripe()`
Initializes Stripe with the publishable key. Called automatically on app launch.

```typescript
import { initializeStripe } from "@/lib/_core/stripe-payment";

await initializeStripe();
```

#### `processSubscriptionPayment()`
Processes a subscription payment with card details.

```typescript
import { processSubscriptionPayment } from "@/lib/_core/stripe-payment";

const result = await processSubscriptionPayment(
  planId,           // "daily", "weekly", "monthly", "yearly"
  cardNumber,       // "1234567890123456"
  expiryMonth,      // 12
  expiryYear,       // 25
  cvc,              // "123"
  cardholder        // "John Doe"
);
```

#### `validateCardNumber()`
Validates card numbers using the Luhn algorithm.

```typescript
import { validateCardNumber } from "@/lib/_core/stripe-payment";

const isValid = validateCardNumber("4532015112830366");
```

### Backend API Endpoints

#### POST `/api/payments/subscribe`
Processes a subscription payment.

**Request:**
```json
{
  "planId": "monthly",
  "cardNumber": "4532015112830366",
  "expiryMonth": 12,
  "expiryYear": 25,
  "cvc": "123",
  "cardholder": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "txn_1234567890_abcdefg",
  "planId": "monthly",
  "message": "Payment processed successfully"
}
```

### Production Considerations

1. **PCI Compliance**: The current implementation uses basic card validation. For production:
   - Use Stripe's CardField component for PCI compliance
   - Never store raw card data on the server
   - Use Stripe's tokenization system

2. **Error Handling**: All payment errors are caught and displayed to the user with helpful messages

3. **Security**: 
   - Card data is validated before transmission
   - Expiry dates are validated
   - CVV is marked as secure input

## Push Notifications Integration

### Setup

1. **Permissions**
   - Notification permissions are requested automatically on app launch
   - Users can grant or deny permissions in the system settings

2. **Notification Handler**
   - Notifications are configured to show alerts, play sounds, and update badges
   - Foreground notifications display immediately
   - Tap handlers can navigate to specific screens

### Key Files

| File | Purpose |
|------|---------|
| `lib/_core/notifications.ts` | Core notification functions |
| `src/hooks/use-workout-reminders.ts` | Reminder management hook |
| `app/_layout.tsx` | Notification initialization |

### API Functions

#### `requestNotificationPermissions()`
Requests notification permissions from the user.

```typescript
import { requestNotificationPermissions } from "@/lib/_core/notifications";

const hasPermission = await requestNotificationPermissions();
```

#### `setupNotificationHandler()`
Sets up the notification handler for foreground notifications.

```typescript
import { setupNotificationHandler } from "@/lib/_core/notifications";

setupNotificationHandler();
```

#### `scheduleWorkoutReminder()`
Schedules a single workout reminder notification.

```typescript
import { scheduleWorkoutReminder } from "@/lib/_core/notifications";

const notificationId = await scheduleWorkoutReminder(
  "Time to workout!",
  "Let's get started!",
  new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
);
```

#### `scheduleWorkoutReminders()`
Schedules multiple reminders based on a schedule.

```typescript
import { scheduleWorkoutReminders } from "@/lib/_core/notifications";

const reminders = [
  { day: "Monday", time: "07:00" },
  { day: "Wednesday", time: "18:30" },
  { day: "Friday", time: "07:00" },
];

const ids = await scheduleWorkoutReminders(reminders);
```

#### `cancelAllNotifications()`
Cancels all scheduled notifications.

```typescript
import { cancelAllNotifications } from "@/lib/_core/notifications";

await cancelAllNotifications();
```

### Using the Reminder Hook

The `useWorkoutReminders` hook provides a convenient way to manage workout reminders:

```typescript
import { useWorkoutReminders } from "@/hooks/use-workout-reminders";

export function ReminderSettings() {
  const {
    reminders,
    isLoading,
    error,
    scheduleReminders,
    cancelReminders,
    addReminder,
    removeReminder,
    updateReminder,
  } = useWorkoutReminders();

  return (
    <View>
      {reminders.map((reminder, index) => (
        <ReminderItem
          key={index}
          reminder={reminder}
          onUpdate={(updated) => updateReminder(index, updated)}
          onRemove={() => removeReminder(index)}
        />
      ))}
      <Button onPress={scheduleReminders} title="Apply Reminders" />
    </View>
  );
}
```

### Default Reminders

If no reminders are configured, the app sets these defaults:
- Monday 7:00 AM
- Wednesday 6:30 PM
- Friday 7:00 AM
- Sunday 9:00 AM

Reminders are stored in AsyncStorage and persist across app sessions.

### Production Considerations

1. **Remote Notifications**: The current implementation uses local notifications. For production:
   - Set up Firebase Cloud Messaging (FCM) for Android
   - Set up Apple Push Notification service (APNs) for iOS
   - Implement server-side notification scheduling

2. **Frequency**: Avoid overwhelming users with too many notifications
   - Maximum 2-3 reminders per week is recommended
   - Respect quiet hours (e.g., 10 PM - 8 AM)

3. **Customization**: Allow users to:
   - Enable/disable reminders
   - Set custom times
   - Choose notification frequency

## Testing

### Payment Testing

Use Stripe's test card numbers:
- **Success**: 4532 0151 1283 0366
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

### Notification Testing

1. **iOS**: Use Xcode's notification simulator or send test notifications via APNs
2. **Android**: Use Firebase Console or Android Studio's notification simulator
3. **Web**: Notifications may not work on web; test on device

## Troubleshooting

### Stripe Issues

| Issue | Solution |
|-------|----------|
| "Stripe publishable key not configured" | Add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `.env` |
| Payment fails with "Invalid card" | Use a valid Stripe test card number |
| "Card number must be 16 digits" | Ensure card number is formatted correctly |

### Notification Issues

| Issue | Solution |
|-------|----------|
| Notifications not showing | Check notification permissions in device settings |
| Notifications not scheduled | Ensure `scheduleReminders()` is called |
| "Running on simulator" warning | Notifications don't work on simulator; test on device |

## Next Steps for Production

1. **Stripe Setup**
   - Create Stripe account and get live API keys
   - Implement proper payment intent flow
   - Add webhook handlers for payment events
   - Set up subscription management in Stripe dashboard

2. **Notifications Setup**
   - Configure Firebase Cloud Messaging (FCM)
   - Configure Apple Push Notification service (APNs)
   - Implement server-side notification scheduling
   - Add user preferences for notification settings

3. **Security**
   - Implement proper authentication for payment endpoints
   - Add rate limiting to prevent abuse
   - Validate all payment data on the server
   - Use HTTPS for all payment requests

4. **Monitoring**
   - Set up error tracking (Sentry, LogRocket)
   - Monitor payment success rates
   - Track notification delivery rates
   - Set up alerts for payment failures

## References

- [Stripe React Native Documentation](https://github.com/stripe/stripe-react-native)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Apple Push Notification Service](https://developer.apple.com/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
