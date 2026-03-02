import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ===== SUBSCRIPTION PLANS =====
export type PlanType = "daily" | "weekly" | "monthly" | "yearly";

export interface PricePlan {
  id: PlanType;
  label: string;
  price: string;
  priceValue: number; // cents
  period: string;
  perWeek: string;
  savings?: string;
  popular?: boolean;
}

export const PLANS: PricePlan[] = [
  {
    id: "daily",
    label: "Daily",
    price: "$0.99",
    priceValue: 99,
    period: "/day",
    perWeek: "$6.93/wk",
  },
  {
    id: "weekly",
    label: "Weekly",
    price: "$5.99",
    priceValue: 599,
    period: "/week",
    perWeek: "$5.99/wk",
    savings: "Save 14%",
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "$19.99",
    priceValue: 1999,
    period: "/month",
    perWeek: "$4.62/wk",
    savings: "Save 33%",
    popular: true,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "$149.99",
    priceValue: 14999,
    period: "/year",
    perWeek: "$2.88/wk",
    savings: "Save 58%",
  },
];

// ===== SUBSCRIPTION STATE =====
export interface SubscriptionState {
  isSubscribed: boolean;
  plan: PlanType | null;
  subscribedAt: string | null; // ISO date
  expiresAt: string | null; // ISO date
  trialEndsAt: string | null; // ISO date (7 days after subscribedAt)
  loaded: boolean;
}

// Storage key is scoped to user ID
function getStorageKey(userId: string | number | null): string {
  if (!userId) return "pulse_subscription_anonymous";
  return `pulse_subscription_${userId}`;
}

interface SubscriptionContextType {
  subscription: SubscriptionState;
  subscribe: (plan: PlanType) => Promise<void>;
  changePlan: (newPlan: PlanType) => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
  isTrialActive: () => boolean;
  getDaysRemaining: () => number;
  getCurrentPlan: () => PricePlan | null;
  setUserId: (userId: string | number | null) => void;
  canUpgradeTo: (newPlan: PlanType) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

const initialState: SubscriptionState = {
  isSubscribed: false,
  plan: null,
  subscribedAt: null,
  expiresAt: null,
  trialEndsAt: null,
  loaded: false,
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionState>(initialState);
  const userIdRef = useRef<string | number | null>(null);

  const loadForUser = useCallback(async (userId: string | number | null) => {
    try {
      const key = getStorageKey(userId);
      console.log("[Subscription] Loading for user:", userId, "key:", key);
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as Omit<SubscriptionState, "loaded">;
        setSubscription({ ...parsed, loaded: true });
        console.log("[Subscription] Loaded state:", parsed.isSubscribed ? "subscribed" : "not subscribed");
      } else {
        console.log("[Subscription] No stored state for user, starting fresh");
        setSubscription({ ...initialState, loaded: true });
      }
    } catch (err) {
      console.error("[Subscription] Failed to load:", err);
      setSubscription({ ...initialState, loaded: true });
    }
  }, []);

  const setUserId = useCallback((userId: string | number | null) => {
    console.log("[Subscription] setUserId:", userId, "previous:", userIdRef.current);
    // Only reload if user actually changed
    if (userId !== userIdRef.current) {
      userIdRef.current = userId;
      // Reset to loading state, then load for new user
      setSubscription({ ...initialState, loaded: false });
      loadForUser(userId);
    }
  }, [loadForUser]);

  // Initial load (anonymous/no user)
  useEffect(() => {
    loadForUser(null);
  }, [loadForUser]);

  // Persist subscription state
  const persist = useCallback(async (state: SubscriptionState) => {
    try {
      const key = getStorageKey(userIdRef.current);
      const { loaded, ...toStore } = state;
      await AsyncStorage.setItem(key, JSON.stringify(toStore));
    } catch (err) {
      console.error("[Subscription] Failed to persist:", err);
    }
  }, []);

  const subscribe = useCallback(async (plan: PlanType) => {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7); // 7-day free trial

    // Calculate expiry based on plan
    const expiry = new Date(trialEnd); // starts after trial
    switch (plan) {
      case "daily":
        expiry.setDate(expiry.getDate() + 1);
        break;
      case "weekly":
        expiry.setDate(expiry.getDate() + 7);
        break;
      case "monthly":
        expiry.setMonth(expiry.getMonth() + 1);
        break;
      case "yearly":
        expiry.setFullYear(expiry.getFullYear() + 1);
        break;
    }

    const newState: SubscriptionState = {
      isSubscribed: true,
      plan,
      subscribedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      trialEndsAt: trialEnd.toISOString(),
      loaded: true,
    };

    setSubscription(newState);
    await persist(newState);
  }, [persist]);

  // Plan upgrade hierarchy: daily < weekly < monthly < yearly
  const planHierarchy: Record<PlanType, number> = {
    daily: 0,
    weekly: 1,
    monthly: 2,
    yearly: 3,
  };

  const canUpgradeTo = useCallback((newPlan: PlanType): boolean => {
    if (!subscription.isSubscribed || !subscription.plan) return false;
    const currentTier = planHierarchy[subscription.plan];
    const newTier = planHierarchy[newPlan];
    return newTier > currentTier;
  }, [subscription.isSubscribed, subscription.plan]);

  const changePlan = useCallback(async (newPlan: PlanType): Promise<boolean> => {
    // Check if user is subscribed
    if (!subscription.isSubscribed || !subscription.plan) {
      console.log("[Subscription] Cannot change plan: not subscribed");
      return false;
    }

    // Check if new plan is an upgrade (higher tier)
    const currentTier = planHierarchy[subscription.plan];
    const newTier = planHierarchy[newPlan];
    if (newTier <= currentTier) {
      console.log("[Subscription] Cannot downgrade from", subscription.plan, "to", newPlan);
      return false; // No downgrades allowed
    }

    // Allow upgrades anytime (not just during trial)
    // Recalculate expiry based on new plan
    const now = new Date();
    const expiry = new Date(now);
    switch (newPlan) {
      case "daily":
        expiry.setDate(expiry.getDate() + 1);
        break;
      case "weekly":
        expiry.setDate(expiry.getDate() + 7);
        break;
      case "monthly":
        expiry.setMonth(expiry.getMonth() + 1);
        break;
      case "yearly":
        expiry.setFullYear(expiry.getFullYear() + 1);
        break;
    }

    const newState: SubscriptionState = {
      isSubscribed: true,
      plan: newPlan,
      subscribedAt: subscription.subscribedAt,
      expiresAt: expiry.toISOString(),
      trialEndsAt: subscription.trialEndsAt,
      loaded: true,
    };

    setSubscription(newState);
    await persist(newState);
    console.log("[Subscription] Upgraded from", subscription.plan, "to", newPlan);
    return true;
  }, [subscription.isSubscribed, subscription.plan, subscription.subscribedAt, subscription.trialEndsAt, persist]);

  const cancelSubscription = useCallback(async () => {
    const newState: SubscriptionState = {
      ...initialState,
      loaded: true,
    };
    setSubscription(newState);
    await persist(newState);
  }, [persist]);

  const isTrialActive = useCallback(() => {
    if (!subscription.trialEndsAt) return false;
    return new Date() < new Date(subscription.trialEndsAt);
  }, [subscription.trialEndsAt]);

  const getDaysRemaining = useCallback(() => {
    if (!subscription.expiresAt) return 0;
    const diff = new Date(subscription.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription.expiresAt]);

  const getCurrentPlan = useCallback(() => {
    if (!subscription.plan) return null;
    return PLANS.find((p) => p.id === subscription.plan) || null;
  }, [subscription.plan]);

  const value: SubscriptionContextType = {
    subscription,
    subscribe,
    changePlan,
    cancelSubscription,
    isTrialActive,
    getDaysRemaining,
    getCurrentPlan,
    setUserId,
    canUpgradeTo,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
