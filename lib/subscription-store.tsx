import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ===== SUBSCRIPTION PLANS =====
export type PlanType = "weekly" | "monthly" | "yearly";

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
    id: "weekly",
    label: "Weekly",
    price: "$1.99",
    priceValue: 199,
    period: "/week",
    perWeek: "$1.99/wk",
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "$5.99",
    priceValue: 599,
    period: "/month",
    perWeek: "$1.50/wk",
    savings: "Save 25%",
    popular: true,
  },
  {
    id: "yearly",
    label: "Yearly",
    price: "$39.99",
    priceValue: 3999,
    period: "/year",
    perWeek: "$0.77/wk",
    savings: "Save 61%",
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

const STORAGE_KEY = "fitlife_subscription";

interface SubscriptionContextType {
  subscription: SubscriptionState;
  subscribe: (plan: PlanType) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  isTrialActive: () => boolean;
  getDaysRemaining: () => number;
  getCurrentPlan: () => PricePlan | null;
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

  // Load subscription state from AsyncStorage
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Omit<SubscriptionState, "loaded">;
          setSubscription({ ...parsed, loaded: true });
        } else {
          setSubscription({ ...initialState, loaded: true });
        }
      } catch (err) {
        console.error("[Subscription] Failed to load:", err);
        setSubscription({ ...initialState, loaded: true });
      }
    };
    load();
  }, []);

  // Persist subscription state
  const persist = useCallback(async (state: SubscriptionState) => {
    try {
      const { loaded, ...toStore } = state;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
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
    cancelSubscription,
    isTrialActive,
    getDaysRemaining,
    getCurrentPlan,
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
