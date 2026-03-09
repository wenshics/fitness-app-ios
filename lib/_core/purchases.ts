/**
 * RevenueCat In-App Purchase integration.
 *
 * Products (create these in App Store Connect → Subscriptions):
 *   monthly_pro  — $19.99/month
 *   yearly_pro   — $149.99/year
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
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Dev-only mock persistence (never runs in production builds) ─────────────
const devMockKey = (userId: string) => `__dev_mock_ci__${userId}`;

export async function saveMockCustomerInfo(ci: CustomerInfo, userId: string): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.setItem(devMockKey(userId), JSON.stringify(ci));
}

async function getDevMockCustomerInfo(userId: string): Promise<CustomerInfo | null> {
  if (!__DEV__) return null;
  try {
    const raw = await AsyncStorage.getItem(devMockKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let _devUserId: string | null = null;

// Product IDs — must match App Store Connect exactly
export const PRODUCT_IDS = {
  monthly: "monthly_pro",
  yearly: "yearly_pro",
} as const;

// RevenueCat entitlement that unlocks pro features
export const PRO_ENTITLEMENT = "pro";

let _initialized = false;
let _initializing: Promise<void> | null = null;
let _initResolvers: Array<() => void> = [];

/** Resolves immediately if already initialized, or waits until configure() completes. */
export function waitForInit(): Promise<void> {
  if (_initialized) return Promise.resolve();
  return new Promise((resolve) => _initResolvers.push(resolve));
}

export async function initializePurchases(userId?: string): Promise<void> {
  if (Platform.OS === "web") return;

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey) {
    console.warn("[Purchases] EXPO_PUBLIC_REVENUECAT_API_KEY not set — IAP disabled");
    return;
  }

  if (_initialized) {
    if (userId) {
      _devUserId = userId;
      await Purchases.logIn(userId);
    }
    return;
  }

  // If initialization is in progress, wait for it then log in
  if (_initializing) {
    await _initializing;
    if (userId) {
      _devUserId = userId;
      await Purchases.logIn(userId);
    }
    return;
  }

  _initializing = (async () => {
    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    await Purchases.configure({ apiKey });
    _initialized = true;
    console.log("[Purchases] RevenueCat initialized");
    _initResolvers.forEach((r) => r());
    _initResolvers = [];
  })();

  await _initializing;

  if (userId) {
    _devUserId = userId;
    await Purchases.logIn(userId);
  }
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  if (Platform.OS === "web") return null;
  // Wait for initialization before fetching offerings
  await waitForInit();
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
  if (Platform.OS === "web" || !_initialized) return null;
  if (__DEV__ && _devUserId) {
    const mock = await getDevMockCustomerInfo(_devUserId);
    if (mock) return mock;
  }
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
  _devUserId = null;
  try {
    await Purchases.logOut();
  } catch (err: any) {
    // RevenueCat throws if user is already anonymous — safe to ignore
    console.warn("[Purchases] logOut error (ignored):", err);
  }
}
