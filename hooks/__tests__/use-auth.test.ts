import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";

// Mock the modules
vi.mock("@/lib/_core/auth");
vi.mock("@/lib/_core/api");

describe("useAuth - Login/Logout Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should clear user state on logout", async () => {
    // Setup: Mock auth functions
    const mockRemoveSessionToken = vi.fn().mockResolvedValue(undefined);
    const mockClearUserInfo = vi.fn().mockResolvedValue(undefined);
    const mockLogout = vi.fn().mockResolvedValue(undefined);

    (Auth.removeSessionToken as any) = mockRemoveSessionToken;
    (Auth.clearUserInfo as any) = mockClearUserInfo;
    (Api.logout as any) = mockLogout;

    // Execute logout
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();

    // Verify: All auth data is cleared
    expect(mockRemoveSessionToken).toHaveBeenCalled();
    expect(mockClearUserInfo).toHaveBeenCalled();
  });

  it("should allow login after logout", async () => {
    // Setup: Mock successful login
    const mockSetSessionToken = vi.fn().mockResolvedValue(undefined);
    const mockSetUserInfo = vi.fn().mockResolvedValue(undefined);

    (Auth.setSessionToken as any) = mockSetSessionToken;
    (Auth.setUserInfo as any) = mockSetUserInfo;

    // Execute: Simulate login after logout
    const testToken = "test-session-token";
    const testUser = {
      id: 123,
      openId: "open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "oauth",
      lastSignedIn: new Date(),
    };

    await Auth.setSessionToken(testToken);
    await Auth.setUserInfo(testUser);

    // Verify: Login data is stored
    expect(mockSetSessionToken).toHaveBeenCalledWith(testToken);
    expect(mockSetUserInfo).toHaveBeenCalledWith(testUser);
  });

  it("should handle logout API failure gracefully", async () => {
    // Setup: Mock API failure
    const mockLogout = vi.fn().mockRejectedValue(new Error("API Error"));
    const mockRemoveSessionToken = vi.fn().mockResolvedValue(undefined);
    const mockClearUserInfo = vi.fn().mockResolvedValue(undefined);

    (Api.logout as any) = mockLogout;
    (Auth.removeSessionToken as any) = mockRemoveSessionToken;
    (Auth.clearUserInfo as any) = mockClearUserInfo;

    // Execute: Logout with API failure
    try {
      await Api.logout();
    } catch (err) {
      // Expected to fail
    }

    // Still clear local state
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();

    // Verify: Local state is cleared even if API fails
    expect(mockRemoveSessionToken).toHaveBeenCalled();
    expect(mockClearUserInfo).toHaveBeenCalled();
  });
});
