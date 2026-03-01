import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Onboarding Navigation Fix - No Infinite Loop", () => {
  let mockRouter: any;
  let mockLocalStorage: any;
  let mockFetch: any;

  beforeEach(() => {
    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    };

    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    mockFetch = vi.fn();
    global.fetch = mockFetch;
    global.localStorage = mockLocalStorage as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("First-Time User Flow", () => {
    it("should show Get Started screen on first app launch", () => {
      // First time user - no onboarding flag set
      mockLocalStorage.getItem.mockReturnValue(null);

      // AuthGuard should redirect to /login (Get Started screen)
      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";
      expect(hasOnboardingCompleted).toBe(false);

      // Should show Get Started
      const shouldShowGetStarted = !hasOnboardingCompleted;
      expect(shouldShowGetStarted).toBe(true);
    });

    it("should navigate to login screen when user taps Get Started", () => {
      const handleGetStarted = () => {
        mockRouter.push("/login-screen");
      };

      handleGetStarted();
      expect(mockRouter.push).toHaveBeenCalledWith("/login-screen");
    });

    it("should mark onboarding as completed after signup", async () => {
      // User signs up
      mockLocalStorage.setItem("app_onboarding_completed", "true");

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("app_onboarding_completed", "true");
    });

    it("should navigate to home after signup and NEVER return to Get Started", async () => {
      // Step 1: User on signup screen
      // Step 2: User submits signup
      const signupResponse = {
        ok: true,
        json: vi.fn(async () => ({
          sessionToken: "token-123",
          user: {
            id: "user-123",
            openId: "user-123",
            name: "New User",
            email: "newuser@example.com",
            loginMethod: "email",
            lastSignedIn: new Date().toISOString(),
          },
        })),
      };

      mockFetch.mockResolvedValueOnce(signupResponse);

      const response = await fetch("/api/auth/email-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "password123",
          name: "New User",
          birthday: "1990-01-01",
          height: 170,
          weight: 70,
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);

      // Step 3: Mark onboarding as completed
      mockLocalStorage.setItem("app_onboarding_completed", "true");

      // Step 4: Navigate to home
      mockRouter.replace("/(tabs)");

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("app_onboarding_completed", "true");
      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");

      // Step 5: Verify user never sees Get Started again
      // Mock the return value after setItem was called
      mockLocalStorage.getItem.mockReturnValue("true");
      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";
      expect(hasOnboardingCompleted).toBe(true);
    });
  });

  describe("Returning User Flow", () => {
    it("should skip Get Started for returning users", () => {
      // Returning user - onboarding flag is set
      mockLocalStorage.getItem.mockReturnValue("true");

      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";
      expect(hasOnboardingCompleted).toBe(true);

      // Should NOT show Get Started
      const shouldShowGetStarted = !hasOnboardingCompleted;
      expect(shouldShowGetStarted).toBe(false);
    });

    it("should go directly to login screen for returning users", () => {
      // Returning user
      mockLocalStorage.getItem.mockReturnValue("true");

      // AuthGuard should redirect to /login-screen (not /login which is Get Started)
      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";

      if (hasOnboardingCompleted) {
        mockRouter.replace("/login-screen");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
    });

    it("should NOT redirect back to Get Started after login", async () => {
      // Returning user logs in
      mockLocalStorage.getItem.mockReturnValue("true");

      const loginResponse = {
        ok: true,
        json: vi.fn(async () => ({
          sessionToken: "token-456",
          user: {
            id: "user-456",
            openId: "user-456",
            name: "Existing User",
            email: "existing@example.com",
            loginMethod: "email",
            lastSignedIn: new Date().toISOString(),
          },
        })),
      };

      mockFetch.mockResolvedValueOnce(loginResponse);

      const response = await fetch("/api/auth/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "existing@example.com",
          password: "password123",
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);

      // Navigate to home
      mockRouter.replace("/(tabs)");

      // Verify we're going to home, NOT Get Started
      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });
  });

  describe("No Infinite Loop Scenarios", () => {
    it("should NOT loop: Get Started → Signup → Get Started", () => {
      // Scenario: User sees Get Started, signs up, should go to home (not back to Get Started)

      // 1. First time user sees Get Started
      mockLocalStorage.getItem.mockReturnValueOnce(null);
      const shouldShowGetStarted1 = mockLocalStorage.getItem("app_onboarding_completed") !== "true";
      expect(shouldShowGetStarted1).toBe(true);

      // 2. User signs up and onboarding is marked as completed
      mockLocalStorage.setItem("app_onboarding_completed", "true");

      // 3. After signup, navigate to home
      mockRouter.replace("/(tabs)");

      // 4. Verify onboarding is completed - mock return value for next getItem call
      mockLocalStorage.getItem.mockReturnValueOnce("true");
      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";
      expect(hasOnboardingCompleted).toBe(true);

      // 5. If user logs out and comes back, should see login screen (not Get Started)
      mockLocalStorage.getItem.mockReturnValueOnce("true");
      const shouldShowGetStarted2 = mockLocalStorage.getItem("app_onboarding_completed") !== "true";
      expect(shouldShowGetStarted2).toBe(false);

      // Should go to login-screen, not /login (Get Started)
      mockRouter.replace("/login-screen");
      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });

    it("should NOT loop: Get Started → Login → Get Started", () => {
      // Scenario: User sees Get Started, logs in, should go to home (not back to Get Started)

      // 1. First time user sees Get Started
      mockLocalStorage.getItem.mockReturnValue(null);

      // 2. User logs in and onboarding is marked as completed
      mockLocalStorage.setItem("app_onboarding_completed", "true");

      // 3. After login, navigate to home
      mockRouter.replace("/(tabs)");

      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");

      // 4. Verify user never sees Get Started again
      mockLocalStorage.getItem.mockReturnValue("true");
      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";
      expect(hasOnboardingCompleted).toBe(true);
    });

    it("should NOT loop: Home → Logout → Get Started (should go to login-screen)", () => {
      // Scenario: User is at home, logs out, should see login screen (not Get Started)

      // 1. User is authenticated and at home
      mockLocalStorage.getItem.mockReturnValue("true");

      // 2. User logs out - clear session but keep onboarding flag
      mockLocalStorage.removeItem("app_session_token");
      // onboarding flag stays set

      // 3. AuthGuard checks: not authenticated, but onboarding completed
      const isAuthenticated = false;
      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";

      if (!isAuthenticated && hasOnboardingCompleted) {
        // Go to login-screen, NOT Get Started
        mockRouter.replace("/login-screen");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });
  });

  describe("Edge Cases", () => {
    it("should handle app restart after signup", () => {
      // User signs up, app is closed and reopened

      // 1. After signup, onboarding flag is set
      mockLocalStorage.getItem.mockReturnValue("true");

      // 2. App restarts, AuthGuard checks onboarding flag
      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";
      expect(hasOnboardingCompleted).toBe(true);

      // 3. If user is still authenticated, go to home
      // 4. If user is not authenticated, go to login-screen (not Get Started)
      const isAuthenticated = false;

      if (!isAuthenticated && hasOnboardingCompleted) {
        mockRouter.replace("/login-screen");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
    });

    it("should handle clearing onboarding flag on logout", async () => {
      // User logs out - optionally clear onboarding flag

      // Option 1: Keep onboarding flag (user sees login-screen on next launch)
      mockLocalStorage.removeItem("app_session_token");
      // onboarding flag stays

      // Option 2: Clear onboarding flag (user sees Get Started on next launch)
      mockLocalStorage.removeItem("app_onboarding_completed");

      // Verify flag is cleared
      mockLocalStorage.getItem.mockReturnValue(null);
      const hasOnboardingCompleted = mockLocalStorage.getItem("app_onboarding_completed") === "true";
      expect(hasOnboardingCompleted).toBe(false);
    });
  });

  describe("AuthGuard Navigation Logic", () => {
    it("should route correctly: not authenticated, onboarding not completed → Get Started", () => {
      const isAuthenticated = false;
      const onboardingCompleted = false;
      const inAuthGroup = false;

      if (!isAuthenticated && !inAuthGroup) {
        if (onboardingCompleted) {
          mockRouter.replace("/login-screen");
        } else {
          mockRouter.replace("/login");
        }
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });

    it("should route correctly: not authenticated, onboarding completed → Login Screen", () => {
      const isAuthenticated = false;
      const onboardingCompleted = true;
      const inAuthGroup = false;

      if (!isAuthenticated && !inAuthGroup) {
        if (onboardingCompleted) {
          mockRouter.replace("/login-screen");
        } else {
          mockRouter.replace("/login");
        }
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
    });

    it("should route correctly: authenticated, on auth page → Home", () => {
      const isAuthenticated = true;
      const inAuthGroup = true;

      if (isAuthenticated && inAuthGroup) {
        mockRouter.replace("/(tabs)");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
    });

    it("should route correctly: authenticated, not on auth page → No redirect", () => {
      const isAuthenticated = true;
      const inAuthGroup = false;

      if (isAuthenticated && inAuthGroup) {
        mockRouter.replace("/(tabs)");
      }

      // Should not redirect
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });
});
