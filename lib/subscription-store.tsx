import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  getCustomerInfo,
  isPro,
  getActivePlanId,
  initializePurchases,
} from "@/lib/_core/purchases";
import type { CustomerInfo } from "react-native-purchases";

// ===== SUBSCRIPTION PLANS =====
export type PlanType = "monthly" | "yearly";

export interface PricePlan {
  id: PlanType;
  label: string;
  price: string;
  priceValue: number;
  period: string;
  perWeek: string;
  savings?: string;
  popular?: boolean;
}

export const PLANS: PricePlan[] = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$19.99",
    priceValue: 1999,
    period: "/month",
    perWeek: "$4.62/wk",
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

// ===== STATE =====
export interface SubscriptionState {
  isSubscribed: boolean;
  plan: PlanType | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  loaded: boolean;
  customerInfo: CustomerInfo | null;
}

interface SubscriptionContextType {
  subscription: SubscriptionState;
  refreshSubscription: () => Promise<void>;
  getCurrentPlan: () => PricePlan | null;
  setUserId: (userId: string | null) => void;
  onPurchaseSuccess: (customerInfo: CustomerInfo) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

const initialState: SubscriptionState = {
  isSubscribed: false,
  plan: null,
  expiresAt: null,
  trialEndsAt: null,
  loaded: false,
  customerInfo: null,
};

function customerInfoToState(ci: CustomerInfo | null): Omit<SubscriptionState, "loaded"> {
  if (!ci || !isPro(ci)) {
    return { isSubscribed: false, plan: null, expiresAt: null, trialEndsAt: null, customerInfo: ci };
  }
  const planId = getActivePlanId(ci);
  const entitlement = ci.entitlements.active["pro"];
  const expiresAt = entitlement?.expirationDate ?? null;
  return { isSubscribed: true, plan: planId, expiresAt, trialEndsAt: null, customerInfo: ci };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionState>(initialState);

  const load = useCallback(async () => {
    if (Platform.OS === "web") {
      setSubscription({ ...initialState, loaded: true });
      return;
    }
    const ci = await getCustomerInfo();
    setSubscription({ ...customerInfoToState(ci), loaded: true });
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshSubscription = useCallback(async () => {
    setSubscription((s) => ({ ...s, loaded: false }));
    await load();
  }, [load]);

  const setUserId = useCallback(async (userId: string | null) => {
    if (userId) {
      await initializePurchases(userId);
    }
    await load();
  }, [load]);

  const onPurchaseSuccess = useCallback((ci: CustomerInfo) => {
    setSubscription({ ...customerInfoToState(ci), loaded: true });
  }, []);

  const getCurrentPlan = useCallback((): PricePlan | null => {
    if (!subscription.plan) return null;
    return PLANS.find((p) => p.id === subscription.plan) ?? null;
  }, [subscription.plan]);

  return (
    <SubscriptionContext.Provider value={{ subscription, refreshSubscription, getCurrentPlan, setUserId, onPurchaseSuccess }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
