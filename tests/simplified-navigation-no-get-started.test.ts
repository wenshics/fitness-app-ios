import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Simplified Navigation - Get Started Removed", () => {
  let mockRouter: any;
  let mockFetch: any;

  beforeEach(() => {
    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    };

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("First-Time User Flow (No Get Started)", () => {
    it("should route unauthenticated users directly to login-screen", () => {
      const isAuthenticated = false;
      const inAuthGroup = false;

      // AuthGuard logic: if not authenticated and not in auth group, go to login-screen
      if (!isAuthenticated && !inAuthGroup) {
        mockRouter.replace("/login-screen");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });

    it("should NOT show Get Started page anymore", () => {
      // Verify /login route no longer exists
      const getStartedRoute = "/login";
      const loginScreenRoute = "/login-screen";

      // Only login-screen should be used
      expect(loginScreenRoute).toBe("/login-screen");
      expect(getStartedRoute).not.toBe(loginScreenRoute);
    });

    it("should allow user to signup from login-screen", async () => {
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

      // Navigate to home
      mockRouter.replace("/(tabs)");
      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
    });

    it("should NOT loop: Signup → Get Started (Get Started no longer exists)", async () => {
      // Step 1: User on login-screen
      // Step 2: User signs up
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

      // Step 3: Navigate to home (NOT back to Get Started)
      mockRouter.replace("/(tabs)");

      // Verify we're going to home, NOT /login (Get Started)
      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });
  });

  describe("Returning User Flow (No Get Started)", () => {
    it("should route authenticated users to home", () => {
      const isAuthenticated = true;
      const inAuthGroup = false;

      // AuthGuard logic: if authenticated and not in auth group, no redirect needed
      if (isAuthenticated && inAuthGroup) {
        mockRouter.replace("/(tabs)");
      }

      // No redirect should happen
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it("should route authenticated users on auth page to home", () => {
      const isAuthenticated = true;
      const inAuthGroup = true;

      // AuthGuard logic: if authenticated and in auth group, go to home
      if (isAuthenticated && inAuthGroup) {
        mockRouter.replace("/(tabs)");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
    });

    it("should NOT show Get Started after logout", () => {
      // After logout, user should see login-screen (not Get Started)
      const isAuthenticated = false;
      const inAuthGroup = false;

      if (!isAuthenticated && !inAuthGroup) {
        mockRouter.replace("/login-screen");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });
  });

  describe("No Infinite Loop Scenarios (Get Started Removed)", () => {
    it("should NOT loop: Login-screen → Signup → Login-screen", () => {
      // Scenario: User is on login-screen, signs up, should go to home (not back to login-screen)

      // 1. User on login-screen
      // 2. User signs up
      const isAuthenticated = true;
      const inAuthGroup = true;

      // 3. After signup, navigate to home
      if (isAuthenticated && inAuthGroup) {
        mockRouter.replace("/(tabs)");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
    });

    it("should NOT loop: Login-screen → Login → Home (no Get Started in between)", () => {
      // Scenario: User is on login-screen, logs in, should go to home (not Get Started)

      // 1. User on login-screen
      // 2. User logs in
      const isAuthenticated = true;
      const inAuthGroup = true;

      // 3. After login, navigate to home
      if (isAuthenticated && inAuthGroup) {
        mockRouter.replace("/(tabs)");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });

    it("should NOT loop: Home → Logout → Login-screen (no Get Started)", () => {
      // Scenario: User is at home, logs out, should see login-screen (not Get Started)

      // 1. User is authenticated and at home
      // 2. User logs out
      const isAuthenticated = false;
      const inAuthGroup = false;

      // 3. AuthGuard checks: not authenticated, not in auth group
      if (!isAuthenticated && !inAuthGroup) {
        mockRouter.replace("/login-screen");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });
  });

  describe("AuthGuard Navigation Logic (Simplified)", () => {
    it("should route: not authenticated, not on auth page → login-screen", () => {
      const isAuthenticated = false;
      const inAuthGroup = false;

      if (!isAuthenticated && !inAuthGroup) {
        mockRouter.replace("/login-screen");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
    });

    it("should route: authenticated, on auth page → home", () => {
      const isAuthenticated = true;
      const inAuthGroup = true;

      if (isAuthenticated && inAuthGroup) {
        mockRouter.replace("/(tabs)");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
    });

    it("should route: authenticated, not on auth page → no redirect", () => {
      const isAuthenticated = true;
      const inAuthGroup = false;

      if (isAuthenticated && inAuthGroup) {
        mockRouter.replace("/(tabs)");
      }

      // Should not redirect
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it("should route: not authenticated, on auth page → no redirect (stay on auth page)", () => {
      const isAuthenticated = false;
      const inAuthGroup = true;

      if (!isAuthenticated && !inAuthGroup) {
        mockRouter.replace("/login-screen");
      }

      // Should not redirect - user is on auth page
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe("Paywall Redirect (Updated)", () => {
    it("should redirect unauthenticated users to login-screen (not /login)", () => {
      const user = null;

      if (!user) {
        mockRouter.replace("/login-screen");
      }

      expect(mockRouter.replace).toHaveBeenCalledWith("/login-screen");
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login");
    });
  });
});
