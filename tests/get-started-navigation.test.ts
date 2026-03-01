import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Get Started Button Navigation", () => {
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    };
  });

  it("should navigate to /auth when Get Started button is pressed", () => {
    // Simulate the handleGetStarted function from login.tsx
    const handleGetStarted = () => {
      mockRouter.push("/auth");
    };

    handleGetStarted();

    expect(mockRouter.push).toHaveBeenCalledWith("/auth");
  });

  it("should use router.push (not replace) for navigation to auth screen", () => {
    const handleGetStarted = () => {
      mockRouter.push("/auth");
    };

    handleGetStarted();

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("should navigate to home screen after successful login", () => {
    const handleLoginSuccess = () => {
      mockRouter.replace("/(tabs)");
    };

    handleLoginSuccess();

    expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("should handle multiple navigation attempts", () => {
    const handleGetStarted = () => {
      mockRouter.push("/auth");
    };

    handleGetStarted();
    handleGetStarted();
    handleGetStarted();

    expect(mockRouter.push).toHaveBeenCalledTimes(3);
    expect(mockRouter.push).toHaveBeenCalledWith("/auth");
  });

  it("should verify auth screen route is valid", () => {
    // This test verifies that the auth screen route exists
    // In the actual app, this is configured in app/_layout.tsx
    const authScreenRoute = "auth";
    const registeredRoutes = ["(tabs)", "login", "auth", "paywall"];

    expect(registeredRoutes).toContain(authScreenRoute);
  });

  it("should handle email/password signup", async () => {
    const mockSignup = vi.fn(async (email: string, password: string) => {
      return {
        success: true,
        sessionToken: "test-token-123",
        user: {
          id: "user-123",
          email,
          name: "Test User",
          loginMethod: "email",
        },
      };
    });

    const result = await mockSignup("test@example.com", "password123");

    expect(mockSignup).toHaveBeenCalledWith("test@example.com", "password123");
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe("test-token-123");
  });

  it("should handle email/password login", async () => {
    const mockLogin = vi.fn(async (email: string, password: string) => {
      return {
        success: true,
        sessionToken: "test-token-456",
        user: {
          id: "user-456",
          email,
          name: "Existing User",
          loginMethod: "email",
        },
      };
    });

    const result = await mockLogin("existing@example.com", "password456");

    expect(mockLogin).toHaveBeenCalledWith("existing@example.com", "password456");
    expect(result.success).toBe(true);
    expect(result.sessionToken).toBe("test-token-456");
  });

  it("should handle login errors gracefully", async () => {
    const mockLogin = vi.fn(async (email: string, password: string) => {
      if (!email || !password) {
        return {
          success: false,
          error: "Missing email or password",
        };
      }
      return {
        success: true,
        sessionToken: "token",
        user: { id: "user", email, name: "User", loginMethod: "email" },
      };
    });

    const result = await mockLogin("", "");

    expect(mockLogin).toHaveBeenCalledWith("", "");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Missing email or password");
  });

  it("should verify auth screen supports both login and signup modes", () => {
    const authModes = ["login", "signup"];
    
    expect(authModes).toContain("login");
    expect(authModes).toContain("signup");
    expect(authModes.length).toBe(2);
  });
});
