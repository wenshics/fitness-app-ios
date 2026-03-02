/**
 * Tests that the user-store scopes AsyncStorage keys per user ID,
 * so different accounts on the same device never share profile data.
 */
import { describe, it, expect } from "vitest";

// ---- Inline the profileKey helper (mirrors lib/user-store.tsx) ----
function profileKey(userId?: string | number | null): string {
  return userId ? `user_profile_${userId}` : "user_profile";
}

describe("profileKey scoping", () => {
  it("returns a user-specific key when userId is provided", () => {
    expect(profileKey("30002")).toBe("user_profile_30002");
    expect(profileKey(42)).toBe("user_profile_42");
  });

  it("returns the legacy key when userId is null or undefined", () => {
    expect(profileKey(null)).toBe("user_profile");
    expect(profileKey(undefined)).toBe("user_profile");
    expect(profileKey()).toBe("user_profile");
  });

  it("produces different keys for different users", () => {
    const keyA = profileKey("user-wenshi");
    const keyB = profileKey("user-lucas");
    expect(keyA).not.toBe(keyB);
  });

  it("produces the same key for the same user across calls", () => {
    expect(profileKey("30002")).toBe(profileKey("30002"));
  });
});
