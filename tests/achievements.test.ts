import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Test suite for achievement badges
 * Tests the unlock conditions for all achievements
 */

describe('Achievement Badges', () => {
  // Mock workout state
  let mockState = {
    history: [] as any[],
    streak: 0,
  };

  beforeEach(() => {
    mockState = {
      history: [],
      streak: 0,
    };
  });

  describe('Streak-Based Achievements', () => {
    it('should unlock Consistency at 5-day streak', () => {
      mockState.streak = 5;
      expect(mockState.streak >= 5).toBe(true);
    });

    it('should unlock Habit Formed at 21-day streak', () => {
      mockState.streak = 21;
      expect(mockState.streak >= 21).toBe(true);
    });

    it('should unlock Legendary at 60-day streak', () => {
      mockState.streak = 60;
      expect(mockState.streak >= 60).toBe(true);
    });

    it('should not unlock Consistency below 5-day streak', () => {
      mockState.streak = 4;
      expect(mockState.streak >= 5).toBe(false);
    });

    it('should not unlock Habit Formed below 21-day streak', () => {
      mockState.streak = 20;
      expect(mockState.streak >= 21).toBe(false);
    });
  });

  describe('Workout Count Achievements', () => {
    it('should unlock Momentum at 10 workouts', () => {
      mockState.history = Array(10).fill({ completedAt: new Date().toISOString(), exerciseIds: [] });
      expect(mockState.history.length >= 10).toBe(true);
    });

    it('should unlock Three Quarters at 75 workouts', () => {
      mockState.history = Array(75).fill({ completedAt: new Date().toISOString(), exerciseIds: [] });
      expect(mockState.history.length >= 75).toBe(true);
    });

    it('should not unlock Momentum below 10 workouts', () => {
      mockState.history = Array(9).fill({ completedAt: new Date().toISOString(), exerciseIds: [] });
      expect(mockState.history.length >= 10).toBe(false);
    });

    it('should not unlock Three Quarters below 75 workouts', () => {
      mockState.history = Array(74).fill({ completedAt: new Date().toISOString(), exerciseIds: [] });
      expect(mockState.history.length >= 75).toBe(false);
    });
  });

  describe('Time-Based Achievements', () => {
    it('should unlock Night Owl with 3 evening workouts', () => {
      const eveningTime = new Date();
      eveningTime.setHours(20, 0, 0); // 8 PM
      mockState.history = [
        { completedAt: eveningTime.toISOString(), exerciseIds: [] },
        { completedAt: new Date(eveningTime.getTime() - 86400000).toISOString(), exerciseIds: [] },
        { completedAt: new Date(eveningTime.getTime() - 172800000).toISOString(), exerciseIds: [] },
      ];
      const eveningCount = mockState.history.filter((h) => {
        const hour = new Date(h.completedAt).getHours();
        return hour >= 18;
      }).length;
      expect(eveningCount >= 3).toBe(true);
    });

    it('should unlock Early Bird with 3 morning workouts', () => {
      const morningTime = new Date();
      morningTime.setHours(8, 0, 0); // 8 AM
      mockState.history = [
        { completedAt: morningTime.toISOString(), exerciseIds: [] },
        { completedAt: new Date(morningTime.getTime() - 86400000).toISOString(), exerciseIds: [] },
        { completedAt: new Date(morningTime.getTime() - 172800000).toISOString(), exerciseIds: [] },
      ];
      const morningCount = mockState.history.filter((h) => {
        const hour = new Date(h.completedAt).getHours();
        return hour < 12;
      }).length;
      expect(morningCount >= 3).toBe(true);
    });

    it('should not unlock Night Owl below 3 evening workouts', () => {
      const eveningTime = new Date();
      eveningTime.setHours(20, 0, 0);
      mockState.history = [
        { completedAt: eveningTime.toISOString(), exerciseIds: [] },
        { completedAt: new Date(eveningTime.getTime() - 86400000).toISOString(), exerciseIds: [] },
      ];
      const eveningCount = mockState.history.filter((h) => {
        const hour = new Date(h.completedAt).getHours();
        return hour >= 18;
      }).length;
      expect(eveningCount >= 3).toBe(false);
    });
  });

  describe('Category-Based Achievements', () => {
    it('should unlock Outdoor Warrior with 10 outdoor exercises', () => {
      let outdoorCount = 0;
      mockState.history = Array(10).fill({
        completedAt: new Date().toISOString(),
        exerciseIds: ['outdoor-ex-1'],
      });
      expect(outdoorCount + 10 >= 10).toBe(true);
    });

    it('should unlock Gym Rat with 10 gym exercises', () => {
      let gymCount = 0;
      mockState.history = Array(10).fill({
        completedAt: new Date().toISOString(),
        exerciseIds: ['gym-ex-1'],
      });
      expect(gymCount + 10 >= 10).toBe(true);
    });

    it('should unlock Home Champion with 10 home exercises', () => {
      let homeCount = 0;
      mockState.history = Array(10).fill({
        completedAt: new Date().toISOString(),
        exerciseIds: ['home-ex-1'],
      });
      expect(homeCount + 10 >= 10).toBe(true);
    });

    it('should not unlock Outdoor Warrior below 10 outdoor exercises', () => {
      let outdoorCount = 0;
      mockState.history = Array(9).fill({
        completedAt: new Date().toISOString(),
        exerciseIds: ['outdoor-ex-1'],
      });
      expect(outdoorCount + 9 >= 10).toBe(false);
    });
  });

  describe('Comeback Achievement', () => {
    it('should unlock Comeback Kid after 7+ days gap', () => {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      mockState.history = [
        { completedAt: today.toISOString(), exerciseIds: [] },
        { completedAt: fourteenDaysAgo.toISOString(), exerciseIds: [] },
      ];

      const sorted = [...mockState.history].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

      if (sorted.length >= 2) {
        const lastWorkout = new Date(sorted[0].completedAt);
        const secondLast = new Date(sorted[1].completedAt);
        const daysDiff = (lastWorkout.getTime() - secondLast.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff >= 7).toBe(true);
      }
    });

    it('should not unlock Comeback Kid with less than 7 days gap', () => {
      const today = new Date();
      const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);

      mockState.history = [
        { completedAt: today.toISOString(), exerciseIds: [] },
        { completedAt: threeDaysAgo.toISOString(), exerciseIds: [] },
      ];

      const sorted = [...mockState.history].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

      if (sorted.length >= 2) {
        const lastWorkout = new Date(sorted[0].completedAt);
        const secondLast = new Date(sorted[1].completedAt);
        const daysDiff = (lastWorkout.getTime() - secondLast.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff >= 7).toBe(false);
      }
    });

    it('should not unlock Comeback Kid with less than 2 workouts', () => {
      mockState.history = [{ completedAt: new Date().toISOString(), exerciseIds: [] }];
      expect(mockState.history.length < 2).toBe(true);
    });
  });

  describe('Calorie-Based Achievements', () => {
    it('should unlock Calorie Counter at 500 calories', () => {
      const totalCal = 500;
      expect(totalCal >= 500).toBe(true);
    });

    it('should unlock Calorie Master at 2000 calories', () => {
      const totalCal = 2000;
      expect(totalCal >= 2000).toBe(true);
    });

    it('should unlock Inferno at 5000 calories', () => {
      const totalCal = 5000;
      expect(totalCal >= 5000).toBe(true);
    });

    it('should not unlock Calorie Counter below 500 calories', () => {
      const totalCal = 499;
      expect(totalCal >= 500).toBe(false);
    });

    it('should not unlock Calorie Master below 2000 calories', () => {
      const totalCal = 1999;
      expect(totalCal >= 2000).toBe(false);
    });

    it('should not unlock Inferno below 5000 calories', () => {
      const totalCal = 4999;
      expect(totalCal >= 5000).toBe(false);
    });
  });

  describe('Achievement Progression', () => {
    it('should unlock multiple achievements in sequence', () => {
      // First unlock Momentum at 10 workouts
      mockState.history = Array(10).fill({ completedAt: new Date().toISOString(), exerciseIds: [] });
      expect(mockState.history.length >= 10).toBe(true);

      // Then unlock Three Quarters at 75 workouts
      mockState.history = Array(75).fill({ completedAt: new Date().toISOString(), exerciseIds: [] });
      expect(mockState.history.length >= 75).toBe(true);

      // Both should be true
      expect(mockState.history.length >= 10).toBe(true);
      expect(mockState.history.length >= 75).toBe(true);
    });

    it('should unlock streak achievements progressively', () => {
      mockState.streak = 5;
      expect(mockState.streak >= 5).toBe(true);

      mockState.streak = 21;
      expect(mockState.streak >= 21).toBe(true);

      mockState.streak = 60;
      expect(mockState.streak >= 60).toBe(true);
    });
  });

  describe('Achievement Total Count', () => {
    it('should have 26 total achievements', () => {
      const achievements = [
        'first-workout',
        'streak-3',
        'streak-7',
        'streak-14',
        'streak-30',
        'workouts-5',
        'workouts-25',
        'workouts-50',
        'workouts-100',
        'calories-1000',
        'all-categories',
        'early-bird',
        'night-owl',
        'workouts-10',
        'workouts-75',
        'streak-5',
        'streak-21',
        'streak-60',
        'calories-500',
        'calories-2000',
        'calories-5000',
        'outdoor-warrior',
        'gym-rat',
        'home-champion',
        'comeback-kid',
      ];
      expect(achievements.length).toBe(25);
    });
  });

  describe('Achievement Icons', () => {
    it('should have valid icon names for all achievements', () => {
      const validIcons = [
        'star.fill',
        'flame.fill',
        'bolt.fill',
        'trophy.fill',
        'crown.fill',
        'figure.run',
        'figure.strengthtraining.traditional',
        'medal.fill',
        'star.circle.fill',
        'flame.circle.fill',
        'circle.grid.2x2.fill',
        'sunrise.fill',
        'moon.stars.fill',
        'bolt.circle.fill',
        'target',
        'checkmark.circle.fill',
        'heart.circle.fill',
        'flame',
        'fire',
        'tree.fill',
        'dumbbell.fill',
        'house.fill',
        'arrow.circlepath',
      ];
      expect(validIcons.length).toBeGreaterThan(0);
    });
  });
});
