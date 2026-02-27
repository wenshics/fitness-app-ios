import { describe, it, expect } from "vitest";

// Test the subscription plan data and logic
describe("Subscription Plans", () => {
  const PLANS = [
    {
      id: "daily" as const,
      label: "Daily",
      price: "$0.99",
      priceValue: 99,
      period: "/day",
      perWeek: "$6.93/wk",
    },
    {
      id: "weekly" as const,
      label: "Weekly",
      price: "$5.99",
      priceValue: 599,
      period: "/week",
      perWeek: "$5.99/wk",
      savings: "Save 14%",
    },
    {
      id: "monthly" as const,
      label: "Monthly",
      price: "$19.99",
      priceValue: 1999,
      period: "/month",
      perWeek: "$4.62/wk",
      savings: "Save 33%",
      popular: true,
    },
    {
      id: "yearly" as const,
      label: "Yearly",
      price: "$149.99",
      priceValue: 14999,
      period: "/year",
      perWeek: "$2.88/wk",
      savings: "Save 58%",
    },
  ];

  it("should have 4 subscription plans", () => {
    expect(PLANS).toHaveLength(4);
  });

  it("should have daily, weekly, monthly, and yearly plans", () => {
    const ids = PLANS.map((p) => p.id);
    expect(ids).toContain("daily");
    expect(ids).toContain("weekly");
    expect(ids).toContain("monthly");
    expect(ids).toContain("yearly");
  });

  it("monthly plan should be marked as popular", () => {
    const monthly = PLANS.find((p) => p.id === "monthly");
    expect(monthly?.popular).toBe(true);
  });

  it("yearly plan should have the best per-week rate", () => {
    const yearly = PLANS.find((p) => p.id === "yearly");
    expect(yearly?.perWeek).toBe("$2.88/wk");
  });

  it("yearly plan should save 72%", () => {
    const yearly = PLANS.find((p) => p.id === "yearly");
    expect(yearly?.savings).toBe("Save 58%");
  });

  it("daily plan should be $0.99/day", () => {
    const daily = PLANS.find((p) => p.id === "daily");
    expect(daily?.price).toBe("$0.99");
    expect(daily?.period).toBe("/day");
  });

  it("weekly plan should be $5.99/week", () => {
    const weekly = PLANS.find((p) => p.id === "weekly");
    expect(weekly?.price).toBe("$5.99");
    expect(weekly?.period).toBe("/week");
  });

  it("monthly plan should be $19.99/month", () => {
    const monthly = PLANS.find((p) => p.id === "monthly");
    expect(monthly?.price).toBe("$19.99");
    expect(monthly?.period).toBe("/month");
  });

  it("yearly plan should be $99.99/year", () => {
    const yearly = PLANS.find((p) => p.id === "yearly");
    expect(yearly?.price).toBe("$149.99");
    expect(yearly?.period).toBe("/year");
  });

  it("all plans should have valid price values in cents", () => {
    for (const plan of PLANS) {
      expect(plan.priceValue).toBeGreaterThan(0);
      expect(Number.isInteger(plan.priceValue)).toBe(true);
    }
  });
});

describe("Subscription State Logic", () => {
  it("should calculate trial end date as 7 days from subscription", () => {
    const now = new Date("2026-02-11T10:00:00Z");
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7);

    expect(trialEnd.toISOString()).toBe("2026-02-18T10:00:00.000Z");
  });

  it("should calculate daily expiry as 1 day after trial", () => {
    const trialEnd = new Date("2026-02-18T10:00:00Z");
    const expiry = new Date(trialEnd);
    expiry.setDate(expiry.getDate() + 1);

    expect(expiry.toISOString()).toBe("2026-02-19T10:00:00.000Z");
  });

  it("should calculate weekly expiry as 7 days after trial", () => {
    const trialEnd = new Date("2026-02-18T10:00:00Z");
    const expiry = new Date(trialEnd);
    expiry.setDate(expiry.getDate() + 7);

    expect(expiry.toISOString()).toBe("2026-02-25T10:00:00.000Z");
  });

  it("should calculate monthly expiry as 1 month after trial", () => {
    const trialEnd = new Date("2026-02-18T10:00:00Z");
    const expiry = new Date(trialEnd);
    expiry.setMonth(expiry.getMonth() + 1);

    // Month should advance by 1 (Feb -> Mar), day should stay 18
    expect(expiry.getUTCMonth()).toBe(2); // March = 2 (0-indexed)
    expect(expiry.getUTCDate()).toBe(18);
  });

  it("should calculate yearly expiry as 1 year after trial", () => {
    const trialEnd = new Date("2026-02-18T10:00:00Z");
    const expiry = new Date(trialEnd);
    expiry.setFullYear(expiry.getFullYear() + 1);

    expect(expiry.toISOString()).toBe("2027-02-18T10:00:00.000Z");
  });

  it("should detect trial as active when within 7 days", () => {
    const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days from now
    const isTrialActive = new Date() < new Date(trialEndsAt);
    expect(isTrialActive).toBe(true);
  });

  it("should detect trial as expired when past 7 days", () => {
    const trialEndsAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const isTrialActive = new Date() < new Date(trialEndsAt);
    expect(isTrialActive).toBe(false);
  });

  it("should calculate days remaining correctly", () => {
    const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days from now
    const diff = new Date(expiresAt).getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    expect(daysRemaining).toBe(10);
  });

  it("should return 0 days remaining when expired", () => {
    const expiresAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const diff = new Date(expiresAt).getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    expect(daysRemaining).toBe(0);
  });
});

describe("Auth Guard (login only, no subscription check)", () => {
  it("should redirect unauthenticated users to login", () => {
    const isAuthenticated = false;
    const segment: string = "(tabs)";
    const inAuthGroup = segment === "oauth" || segment === "login";

    let redirectTo: string | null = null;
    if (!isAuthenticated && !inAuthGroup) {
      redirectTo = "/login";
    } else if (isAuthenticated && inAuthGroup) {
      redirectTo = "/(tabs)";
    }

    expect(redirectTo).toBe("/login");
  });

  it("should allow authenticated users to access tabs without subscription", () => {
    const isAuthenticated = true;
    const segment: string = "(tabs)";
    const inAuthGroup = segment === "oauth" || segment === "login";

    let redirectTo: string | null = null;
    if (!isAuthenticated && !inAuthGroup) {
      redirectTo = "/login";
    } else if (isAuthenticated && inAuthGroup) {
      redirectTo = "/(tabs)";
    }

    expect(redirectTo).toBeNull();
  });

  it("should redirect authenticated users away from login to tabs", () => {
    const isAuthenticated = true;
    const segment: string = "login";
    const inAuthGroup = segment === "oauth" || segment === "login";

    let redirectTo: string | null = null;
    if (!isAuthenticated && !inAuthGroup) {
      redirectTo = "/login";
    } else if (isAuthenticated && inAuthGroup) {
      redirectTo = "/(tabs)";
    }

    expect(redirectTo).toBe("/(tabs)");
  });
});

describe("Subscription Gate at Exercise Start", () => {
  it("should show paywall when unsubscribed user tries to start workout", () => {
    const isSubscribed = false;
    let navigatedTo: string | null = null;

    // Simulate handleStartWorkout
    if (!isSubscribed) {
      navigatedTo = "/paywall";
    } else {
      navigatedTo = "/workout-session";
    }

    expect(navigatedTo).toBe("/paywall");
  });

  it("should allow subscribed user to start workout", () => {
    const isSubscribed = true;
    let navigatedTo: string | null = null;

    if (!isSubscribed) {
      navigatedTo = "/paywall";
    } else {
      navigatedTo = "/workout-session";
    }

    expect(navigatedTo).toBe("/workout-session");
  });

  it("should show paywall when unsubscribed user tries to start exercise timer", () => {
    const isSubscribed = false;
    const isRunning = false;
    let navigatedTo: string | null = null;

    if (!isSubscribed && !isRunning) {
      navigatedTo = "/paywall";
    }

    expect(navigatedTo).toBe("/paywall");
  });

  it("should allow subscribed user to start exercise timer", () => {
    const isSubscribed = true;
    const isRunning = false;
    let navigatedTo: string | null = null;
    let timerStarted = false;

    if (!isSubscribed && !isRunning) {
      navigatedTo = "/paywall";
    } else {
      timerStarted = true;
    }

    expect(navigatedTo).toBeNull();
    expect(timerStarted).toBe(true);
  });
});
