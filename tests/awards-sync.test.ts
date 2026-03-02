import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveAwardToBackend, getAwardsFromBackend, checkAwardBackend } from "@/lib/awards-api";

// Mock fetch globally
global.fetch = vi.fn();

describe("Awards API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveAwardToBackend", () => {
    it("should save an award to the backend", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const award = {
        id: "first-workout",
        name: "First Workout",
        description: "Complete your first workout",
        icon: "checkmark.circle.fill",
      };

      const result = await saveAwardToBackend(award, "test-token");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/awards/save"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "Bearer test-token",
          }),
        })
      );
    });

    it("should handle API errors gracefully", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const award = {
        id: "first-workout",
        name: "First Workout",
        description: "Complete your first workout",
        icon: "checkmark.circle.fill",
      };

      const result = await saveAwardToBackend(award, "test-token");

      expect(result).toBe(false);
    });

    it("should handle network errors", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const award = {
        id: "first-workout",
        name: "First Workout",
        description: "Complete your first workout",
        icon: "checkmark.circle.fill",
      };

      const result = await saveAwardToBackend(award, "test-token");

      expect(result).toBe(false);
    });
  });

  describe("getAwardsFromBackend", () => {
    it("should retrieve awards from the backend", async () => {
      const mockFetch = global.fetch as any;
      const mockAwards = [
        {
          id: "first-workout",
          name: "First Workout",
          description: "Complete your first workout",
          icon: "checkmark.circle.fill",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ awards: mockAwards }),
      });

      const result = await getAwardsFromBackend("test-token");

      expect(result).toEqual(mockAwards);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/awards/list"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Authorization": "Bearer test-token",
          }),
        })
      );
    });

    it("should return empty array on error", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await getAwardsFromBackend("invalid-token");

      expect(result).toEqual([]);
    });
  });

  describe("checkAwardBackend", () => {
    it("should check if user has an award", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasAward: true }),
      });

      const result = await checkAwardBackend("first-workout", "test-token");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/awards/check/first-workout"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should return false if user doesn't have award", async () => {
      const mockFetch = global.fetch as any;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasAward: false }),
      });

      const result = await checkAwardBackend("legendary", "test-token");

      expect(result).toBe(false);
    });
  });
});
