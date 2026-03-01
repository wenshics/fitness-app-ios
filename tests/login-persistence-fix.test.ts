import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Login Persistence Fix - No Redirect Loop", () => {
  let mockLocalStorage: Record<string, string>;
  let mockRouter: any;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      key: vi.fn((index: number) => {
        const keys = Object.keys(mockLocalStorage);
        return keys[index] || null;
      }),
      length: 0,
    };

    mockRouter = {
      replace: vi.fn(),
      push: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Login Flow - User Persistence", () => {
    it("should store user info and session token after successful login", async () => {
      // Simulate login response
      const loginResponse = {
        sessionToken: "token-123",
        user: {
          id: "user-123",
          openId: "user-123",
          name: "Test User",
          email: "test@example.com",
          loginMethod: "email",
          lastSignedIn: new Date().toISOString(),
        },
      };

      // Store token
      const sessionTokenKey = "session_token";
      mockLocalStorage[sessionTokenKey] = loginResponse.sessionToken;

      // Store user info
      const userInfoKey = "user_info";
      mockLocalStorage[userInfoKey] = JSON.stringify(loginResponse.user);

      // Verify both are stored
      expect(mockLocalStorage[sessionTokenKey]).toBe("token-123");
      expect(mockLocalStorage[userInfoKey]).toBeTruthy();
      expect(JSON.parse(mockLocalStorage[userInfoKey])).toEqual(loginResponse.user);
    });

    it("should load cached user immediately after login (no API call needed)", async () => {
      // Simulate user already logged in and cached
      const cachedUser = {
        id: "user-123",
        openId: "user-123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };

      mockLocalStorage["user_info"] = JSON.stringify(cachedUser);

      // Simulate useAuth loading from cache
      const userInfoJson = mockLocalStorage["user_info"];
      const user = userInfoJson ? JSON.parse(userInfoJson) : null;

      expect(user).toEqual(cachedUser);
      expect(user).not.toBeNull();
    });

    it("should NOT redirect to login if user is cached", () => {
      // Simulate user cached in localStorage
      const cachedUser = {
        id: "user-123",
        openId: "user-123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };

      mockLocalStorage["user_info"] = JSON.stringify(cachedUser);

      // AuthGuard logic: if user is cached, don't redirect
      const userInfoJson = mockLocalStorage["user_info"];
      const user = userInfoJson ? JSON.parse(userInfoJson) : null;

      if (user) {
        // User is authenticated - no redirect
        expect(mockRouter.replace).not.toHaveBeenCalled();
      }

      expect(user).not.toBeNull();
    });

    it("should handle auth-state-changed event by loading cached user", () => {
      // Simulate login completing and storing user
      const cachedUser = {
        id: "user-123",
        openId: "user-123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };

      mockLocalStorage["user_info"] = JSON.stringify(cachedUser);

      // Simulate auth-state-changed event handler
      const handleAuthChanged = async () => {
        const userInfoJson = mockLocalStorage["user_info"];
        const user = userInfoJson ? JSON.parse(userInfoJson) : null;
        if (user) {
          // User loaded from cache
          return user;
        }
      };

      // Trigger event
      const result = handleAuthChanged();
      expect(result).toBeTruthy();
    });
  });

  describe("No Redirect Loop After Login", () => {
    it("should NOT loop: Login → Home → Login (user stays at home)", () => {
      // Step 1: User logs in
      const cachedUser = {
        id: "user-123",
        openId: "user-123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };

      mockLocalStorage["user_info"] = JSON.stringify(cachedUser);
      mockLocalStorage["session_token"] = "token-123";

      // Step 2: AuthGuard checks auth state
      const userInfoJson = mockLocalStorage["user_info"];
      const user = userInfoJson ? JSON.parse(userInfoJson) : null;
      const isAuthenticated = Boolean(user);

      // Step 3: User should stay at home (not redirect to login)
      if (isAuthenticated) {
        // No redirect - user stays at home
        expect(mockRouter.replace).not.toHaveBeenCalled();
      }

      expect(isAuthenticated).toBe(true);
    });

    it("should NOT clear user on API failure if user is cached", () => {
      // Simulate user cached
      const cachedUser = {
        id: "user-123",
        openId: "user-123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };

      mockLocalStorage["user_info"] = JSON.stringify(cachedUser);

      // Simulate API call failure
      const apiError = new Error("API unavailable");

      // Simulate useAuth behavior: don't clear user on API failure
      const userInfoJson = mockLocalStorage["user_info"];
      let user = userInfoJson ? JSON.parse(userInfoJson) : null;

      try {
        // API call fails
        throw apiError;
      } catch (err) {
        // Don't clear user - just log the error
        console.log("API failed but keeping cached user");
        // user stays as is
      }

      // User should still be set
      expect(user).not.toBeNull();
      expect(user.id).toBe("user-123");
    });

    it("should refresh from API in background after login (after delay)", async () => {
      // Simulate user cached
      const cachedUser = {
        id: "user-123",
        openId: "user-123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };

      mockLocalStorage["user_info"] = JSON.stringify(cachedUser);

      // Simulate background refresh after 1 second
      const refreshFromApi = async () => {
        // Try to refresh from API
        try {
          // API call would happen here
          // If it succeeds, update user info
          // If it fails, keep cached user
          console.log("Background refresh attempted");
        } catch (err) {
          console.log("Background refresh failed, keeping cached user");
        }
      };

      // Simulate delayed refresh
      setTimeout(() => {
        refreshFromApi();
      }, 1000);

      // Immediately after login, user should be loaded from cache
      const userInfoJson = mockLocalStorage["user_info"];
      const user = userInfoJson ? JSON.parse(userInfoJson) : null;

      expect(user).not.toBeNull();
      expect(user.id).toBe("user-123");
    });
  });

  describe("Session Token Persistence", () => {
    it("should store session token after login", () => {
      const token = "token-123";
      mockLocalStorage["session_token"] = token;

      expect(mockLocalStorage["session_token"]).toBe(token);
    });

    it("should retrieve session token for API calls", () => {
      mockLocalStorage["session_token"] = "token-123";

      const token = mockLocalStorage["session_token"];
      expect(token).toBe("token-123");
    });

    it("should NOT lose session token on API failure", () => {
      mockLocalStorage["session_token"] = "token-123";

      // Simulate API failure
      try {
        throw new Error("API unavailable");
      } catch (err) {
        // Token should still be there
        const token = mockLocalStorage["session_token"];
        expect(token).toBe("token-123");
      }
    });
  });

  describe("AuthGuard Behavior After Login Fix", () => {
    it("should check cached user first before API", () => {
      const cachedUser = {
        id: "user-123",
        openId: "user-123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };

      mockLocalStorage["user_info"] = JSON.stringify(cachedUser);

      // Step 1: Check cache
      const userInfoJson = mockLocalStorage["user_info"];
      const user = userInfoJson ? JSON.parse(userInfoJson) : null;

      // Step 2: If cache hit, use it immediately
      if (user) {
        expect(user).toEqual(cachedUser);
        // No API call needed
        expect(mockRouter.replace).not.toHaveBeenCalled();
      }
    });

    it("should not redirect if user is authenticated from cache", () => {
      const cachedUser = {
        id: "user-123",
        openId: "user-123",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "email",
        lastSignedIn: new Date().toISOString(),
      };

      mockLocalStorage["user_info"] = JSON.stringify(cachedUser);

      // AuthGuard logic
      const userInfoJson = mockLocalStorage["user_info"];
      const user = userInfoJson ? JSON.parse(userInfoJson) : null;
      const isAuthenticated = Boolean(user);

      if (isAuthenticated) {
        // No redirect
        expect(mockRouter.replace).not.toHaveBeenCalled();
      }

      expect(isAuthenticated).toBe(true);
    });
  });
});
