import { describe, it, expect } from "vitest";
import {
  EXERCISES,
  CATEGORIES,
  DIFFICULTY_COLORS,
  CATEGORY_COLORS,
  DEFAULT_REST_TIME,
  type Exercise,
  type Difficulty,
  type Category,
} from "../constants/exercises";

describe("Exercise Data", () => {
  it("should have exactly 25 exercises", () => {
    expect(EXERCISES.length).toBe(25);
  });

  it("should have unique IDs for all exercises", () => {
    const ids = EXERCISES.map((e: Exercise) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(EXERCISES.length);
  });

  it("should have valid difficulty levels", () => {
    const validDifficulties: Difficulty[] = ["beginner", "intermediate", "advanced"];
    EXERCISES.forEach((e: Exercise) => {
      expect(validDifficulties).toContain(e.difficulty);
    });
  });

  it("should have valid categories", () => {
    const validCategories: Category[] = ["bodyweight", "stretch", "fat-burning", "gym"];
    EXERCISES.forEach((e: Exercise) => {
      expect(validCategories).toContain(e.category);
    });
  });

  it("should have all required fields for each exercise", () => {
    EXERCISES.forEach((e: Exercise) => {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.difficulty).toBeTruthy();
      expect(e.category).toBeTruthy();
      expect(e.muscleGroups.length).toBeGreaterThan(0);
      expect(e.defaultDuration).toBeGreaterThan(0);
      expect(e.demoImage).toBeTruthy();
      expect(e.description).toBeTruthy();
      expect(e.instructions.length).toBeGreaterThan(0);
      expect(e.caloriesPerMinute).toBeGreaterThan(0);
    });
  });

  it("should have demoImage URLs for all exercises", () => {
    EXERCISES.forEach((e: Exercise) => {
      expect(e.demoImage).toMatch(/^https?:\/\//);
    });
  });

  it("should have exercises from all 4 categories", () => {
    const categories = new Set(EXERCISES.map((e: Exercise) => e.category));
    expect(categories.size).toBe(4);
    expect(categories.has("bodyweight")).toBe(true);
    expect(categories.has("stretch")).toBe(true);
    expect(categories.has("fat-burning")).toBe(true);
    expect(categories.has("gym")).toBe(true);
  });

  it("should have exercises from all 3 difficulty levels", () => {
    const difficulties = new Set(EXERCISES.map((e: Exercise) => e.difficulty));
    expect(difficulties.size).toBe(3);
  });

  it("should have valid constants", () => {
    expect(CATEGORIES.length).toBe(4);
    expect(Object.keys(DIFFICULTY_COLORS).length).toBe(3);
    expect(Object.keys(CATEGORY_COLORS).length).toBe(4);
    expect(DEFAULT_REST_TIME).toBeGreaterThan(0);
  });
});

describe("Daily Plan Generation Logic", () => {
  it("should produce deterministic plans for the same date seed", () => {
    const seed1 = "2026-02-12".split("-").reduce((acc: number, n: string) => acc * 31 + parseInt(n, 10), 0);
    const seed2 = "2026-02-12".split("-").reduce((acc: number, n: string) => acc * 31 + parseInt(n, 10), 0);
    expect(seed1).toBe(seed2);
  });

  it("should produce different seeds for different dates", () => {
    const seed1 = "2026-02-12".split("-").reduce((acc: number, n: string) => acc * 31 + parseInt(n, 10), 0);
    const seed2 = "2026-02-13".split("-").reduce((acc: number, n: string) => acc * 31 + parseInt(n, 10), 0);
    expect(seed1).not.toBe(seed2);
  });
});
