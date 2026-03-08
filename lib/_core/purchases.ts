/**
 * RevenueCat In-App Purchase integration.
 *
 * Products (create these in App Store Connect → Subscriptions):
 *   pulse_monthly  — $19.99/month
 *   pulse_yearly   — $149.99/year
 *
 * RevenueCat setup:
 *   1. Create a RevenueCat project at https://app.revenuecat.com
 *   2. Add your iOS app with the bundle ID
 *   3. Create an Entitlement called "pro"
 *   4. Create an Offering called "default" with the two products above
 *   5. Set EXPO_PUBLIC_REVENUECAT_API_KEY in your env
 */
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform } from "react-native";

// Product IDs — must match App Store Connect exactly
export const PRODUCT_IDS = {
  monthly: "pulse_monthly",
  yearly: "pulse_yearly",
} as const;

// RevenueCat entitlement that unlocks pro features
export const PRO_ENTITLEMENT = "pro";

let _initialized = false;

export async function initializePurchases(userId?: string): Promise<void> {
  if (Platform.OS === "web") return; // IAP not available on web

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey) {
    console.warn("[Purchases] EXPO_PUBLIC_REVENUECAT_API_KEY not set — IAP disabled");
    return;
  }

  if (_initialized) {
    // If user changed, update the RevenueCat user ID
    if (userId) {
      await Purchases.logIn(userId);
    }
    return;
  }

  Purchases.setLogLevel(
    process.env.NODE_ENV === "development" ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR
  );
  await Purchases.configure({ apiKey });

  if (userId) {
    await Purchases.logIn(userId);
  }

  _initialized = true;
  console.log("[Purchases] RevenueCat initialized");
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  if (Platform.OS === "web") return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    console.error("[Purchases] getOffering error:", err);
    return null;
  }
}

export async function purchasePackage(packageToPurchase: any): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    return customerInfo;
  } catch (err: any) {
    if (err.userCancelled) return null; // user tapped cancel — not an error
    throw err;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (Platform.OS === "web") return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.error("[Purchases] getCustomerInfo error:", err);
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (Platform.OS === "web") return null;
  try {
    return await Purchases.restorePurchases();
  } catch (err) {
    console.error("[Purchases] restorePurchases error:", err);
    return null;
  }
}

export function isPro(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return PRO_ENTITLEMENT in customerInfo.entitlements.active;
}

export function getActivePlanId(customerInfo: CustomerInfo | null): "monthly" | "yearly" | null {
  if (!isPro(customerInfo)) return null;
  const entitlement = customerInfo!.entitlements.active[PRO_ENTITLEMENT];
  const productId = entitlement?.productIdentifier ?? "";
  if (productId === PRODUCT_IDS.yearly) return "yearly";
  if (productId === PRODUCT_IDS.monthly) return "monthly";
  return "monthly"; // fallback
}

export async function logoutPurchases(): Promise<void> {
  if (Platform.OS === "web" || !_initialized) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn("[Purchases] logOut error (ignored):", err);
  }
}
