import { describe, it, expect } from "vitest";
import {
  EXERCISES,
  DIFFICULTY_COLORS,
  DEFAULT_BEGINNER_PLAN,
  DEFAULT_REST_TIME,
  type Exercise,
  type Difficulty,
} from "../constants/exercises";

describe("Exercise Data", () => {
  it("should have at least 12 exercises", () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(12);
  });

  it("should have at most 20 exercises", () => {
    expect(EXERCISES.length).toBeLessThanOrEqual(20);
  });

  it("should have exactly 16 exercises", () => {
    expect(EXERCISES.length).toBe(16);
  });

  it("should have unique IDs for all exercises", () => {
    const ids = EXERCISES.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have exercises in all three difficulty levels", () => {
    const difficulties = new Set(EXERCISES.map((e) => e.difficulty));
    expect(difficulties.has("beginner")).toBe(true);
    expect(difficulties.has("intermediate")).toBe(true);
    expect(difficulties.has("advanced")).toBe(true);
  });

  it("should have 6 beginner exercises", () => {
    const beginnerCount = EXERCISES.filter((e) => e.difficulty === "beginner").length;
    expect(beginnerCount).toBe(6);
  });

  it("should have 5 intermediate exercises", () => {
    const intermediateCount = EXERCISES.filter((e) => e.difficulty === "intermediate").length;
    expect(intermediateCount).toBe(5);
  });

  it("should have 5 advanced exercises", () => {
    const advancedCount = EXERCISES.filter((e) => e.difficulty === "advanced").length;
    expect(advancedCount).toBe(5);
  });

  it("every exercise should have a valid YouTube video ID", () => {
    EXERCISES.forEach((exercise) => {
      expect(exercise.youtubeVideoId).toBeTruthy();
      expect(exercise.youtubeVideoId.length).toBeGreaterThan(0);
    });
  });

  it("every exercise should have at least one muscle group", () => {
    EXERCISES.forEach((exercise) => {
      expect(exercise.muscleGroups.length).toBeGreaterThan(0);
    });
  });

  it("every exercise should have instructions", () => {
    EXERCISES.forEach((exercise) => {
      expect(exercise.instructions.length).toBeGreaterThan(0);
    });
  });

  it("every exercise should have a positive default duration", () => {
    EXERCISES.forEach((exercise) => {
      expect(exercise.defaultDuration).toBeGreaterThan(0);
    });
  });

  it("every exercise should have a name and description", () => {
    EXERCISES.forEach((exercise) => {
      expect(exercise.name.length).toBeGreaterThan(0);
      expect(exercise.description.length).toBeGreaterThan(0);
    });
  });

  it("every exercise should have a thumbnail URL", () => {
    EXERCISES.forEach((exercise) => {
      expect(exercise.thumbnail).toMatch(/^https?:\/\//);
    });
  });
});

describe("Difficulty Colors", () => {
  it("should have colors for all difficulty levels", () => {
    const levels: Difficulty[] = ["beginner", "intermediate", "advanced"];
    levels.forEach((level) => {
      expect(DIFFICULTY_COLORS[level]).toBeDefined();
      expect(DIFFICULTY_COLORS[level].bg).toBeTruthy();
      expect(DIFFICULTY_COLORS[level].text).toBeTruthy();
    });
  });
});

describe("Default Beginner Plan", () => {
  it("should contain valid exercise IDs", () => {
    const exerciseIds = EXERCISES.map((e) => e.id);
    DEFAULT_BEGINNER_PLAN.forEach((id) => {
      expect(exerciseIds).toContain(id);
    });
  });

  it("should contain only beginner exercises", () => {
    DEFAULT_BEGINNER_PLAN.forEach((id) => {
      const exercise = EXERCISES.find((e) => e.id === id);
      expect(exercise).toBeDefined();
      expect(exercise!.difficulty).toBe("beginner");
    });
  });

  it("should have a positive default rest time", () => {
    expect(DEFAULT_REST_TIME).toBeGreaterThan(0);
  });
});
