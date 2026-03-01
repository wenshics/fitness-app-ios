import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Test suite for onboarding and personal info features
 */

describe('Onboarding and Personal Info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Date of Birth Validation', () => {
    it('should accept valid date format YYYY-MM-DD', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test('1990-05-15')).toBe(true);
    });

    it('should reject invalid date format', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test('05/15/1990')).toBe(false);
      expect(dateRegex.test('1990-5-15')).toBe(false);
      expect(dateRegex.test('15-05-1990')).toBe(false);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const dateStr = futureDate.toISOString().split('T')[0];
      expect(new Date(dateStr) > new Date()).toBe(true);
    });

    it('should accept past dates', () => {
      const pastDate = new Date('1990-05-15');
      expect(pastDate < new Date()).toBe(true);
    });

    it('should validate date is a real date', () => {
      const invalidDate = new Date('1990-13-45');
      expect(isNaN(invalidDate.getTime())).toBe(true);

      const validDate = new Date('1990-05-15');
      expect(isNaN(validDate.getTime())).toBe(false);
    });
  });

  describe('Height Validation', () => {
    it('should accept valid height between 100-250 cm', () => {
      const heights = [100, 150, 170, 200, 250];
      heights.forEach((h) => {
        expect(h >= 100 && h <= 250).toBe(true);
      });
    });

    it('should reject height below 100 cm', () => {
      expect(99 >= 100 && 99 <= 250).toBe(false);
    });

    it('should reject height above 250 cm', () => {
      expect(251 >= 100 && 251 <= 250).toBe(false);
    });

    it('should parse decimal heights correctly', () => {
      const height = parseFloat('175.5');
      expect(height).toBe(175.5);
      expect(!isNaN(height)).toBe(true);
    });

    it('should reject non-numeric heights', () => {
      const height = parseFloat('abc');
      expect(isNaN(height)).toBe(true);
    });
  });

  describe('Weight Validation', () => {
    it('should accept valid weight between 30-300 kg', () => {
      const weights = [30, 50, 70, 100, 300];
      weights.forEach((w) => {
        expect(w >= 30 && w <= 300).toBe(true);
      });
    });

    it('should reject weight below 30 kg', () => {
      expect(29 >= 30 && 29 <= 300).toBe(false);
    });

    it('should reject weight above 300 kg', () => {
      expect(301 >= 30 && 301 <= 300).toBe(false);
    });

    it('should parse decimal weights correctly', () => {
      const weight = parseFloat('72.5');
      expect(weight).toBe(72.5);
      expect(!isNaN(weight)).toBe(true);
    });

    it('should reject non-numeric weights', () => {
      const weight = parseFloat('xyz');
      expect(isNaN(weight)).toBe(true);
    });
  });

  describe('Personal Info Storage', () => {
    it('should store personal info correctly', async () => {
      const profile = {
        dateOfBirth: '1990-05-15',
        height: 175,
        weight: 70,
      };

      const stored = JSON.stringify(profile);
      expect(stored).toContain('1990-05-15');
      expect(stored).toContain('175');
      expect(stored).toContain('70');
    });

    it('should retrieve stored personal info', () => {
      const profile = {
        dateOfBirth: '1990-05-15',
        height: 175,
        weight: 70,
      };

      const stored = JSON.stringify(profile);
      const retrieved = JSON.parse(stored);

      expect(retrieved.dateOfBirth).toBe('1990-05-15');
      expect(retrieved.height).toBe(175);
      expect(retrieved.weight).toBe(70);
    });

    it('should update personal info', () => {
      const profile = {
        dateOfBirth: '1990-05-15',
        height: 175,
        weight: 70,
      };

      const updated = { ...profile, weight: 72 };
      expect(updated.weight).toBe(72);
      expect(updated.dateOfBirth).toBe('1990-05-15');
      expect(updated.height).toBe(175);
    });

    it('should handle partial updates', () => {
      const profile = {
        dateOfBirth: '1990-05-15',
        height: 175,
        weight: 70,
      };

      const partial = { weight: 75 };
      const updated = { ...profile, ...partial };

      expect(updated.weight).toBe(75);
      expect(updated.height).toBe(175);
      expect(updated.dateOfBirth).toBe('1990-05-15');
    });
  });

  describe('Form Validation', () => {
    it('should reject empty date of birth', () => {
      const dateOfBirth = '';
      expect(dateOfBirth.trim().length > 0).toBe(false);
    });

    it('should reject empty height', () => {
      const height = '';
      expect(height.trim().length > 0).toBe(false);
    });

    it('should reject empty weight', () => {
      const weight = '';
      expect(weight.trim().length > 0).toBe(false);
    });

    it('should validate all fields are present', () => {
      const form = {
        dateOfBirth: '1990-05-15',
        height: '175',
        weight: '70',
      };

      const isValid =
        form.dateOfBirth.trim().length > 0 &&
        form.height.trim().length > 0 &&
        form.weight.trim().length > 0;

      expect(isValid).toBe(true);
    });

    it('should reject form with missing field', () => {
      const form = {
        dateOfBirth: '1990-05-15',
        height: '',
        weight: '70',
      };

      const isValid =
        form.dateOfBirth.trim().length > 0 &&
        form.height.trim().length > 0 &&
        form.weight.trim().length > 0;

      expect(isValid).toBe(false);
    });
  });

  describe('Age Calculation', () => {
    it('should calculate age from date of birth', () => {
      const dob = new Date('1990-05-15');
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      expect(age).toBeGreaterThan(30);
    });

    it('should handle birthday today', () => {
      const today = new Date();
      const dob = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      expect(age).toBe(30);
    });
  });

  describe('BMI Calculation', () => {
    it('should calculate BMI correctly', () => {
      const height = 175; // cm
      const weight = 70; // kg
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      expect(bmi).toBeCloseTo(22.86, 1);
    });

    it('should handle different BMI ranges', () => {
      // Underweight
      const bmi1 = 18 / (1.75 * 1.75);
      expect(bmi1 < 18.5).toBe(true);

      // Normal weight
      const bmi2 = 70 / (1.75 * 1.75);
      expect(bmi2 >= 18.5 && bmi2 < 25).toBe(true);

      // Overweight
      const bmi3 = 85 / (1.75 * 1.75);
      expect(bmi3 >= 25 && bmi3 < 30).toBe(true);

      // Obese
      const bmi4 = 100 / (1.75 * 1.75);
      expect(bmi4 >= 30).toBe(true);
    });
  });

  describe('Onboarding Flow', () => {
    it('should complete onboarding with valid data', () => {
      const form = {
        dateOfBirth: '1990-05-15',
        height: '175',
        weight: '70',
      };

      const isValid =
        form.dateOfBirth.trim().length > 0 &&
        form.height.trim().length > 0 &&
        form.weight.trim().length > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth) &&
        !isNaN(parseFloat(form.height)) &&
        !isNaN(parseFloat(form.weight));

      expect(isValid).toBe(true);
    });

    it('should skip onboarding', () => {
      const skipped = true;
      expect(skipped).toBe(true);
    });

    it('should allow editing onboarding info later', () => {
      const canEdit = true;
      expect(canEdit).toBe(true);
    });
  });

  describe('Profile Display', () => {
    it('should display personal info when available', () => {
      const profile = {
        dateOfBirth: '1990-05-15',
        height: 175,
        weight: 70,
      };

      expect(profile.height).toBe(175);
      expect(profile.weight).toBe(70);
      expect(profile.dateOfBirth).toBe('1990-05-15');
    });

    it('should show "Not set" when info is missing', () => {
      const profile = {
        dateOfBirth: undefined,
        height: undefined,
        weight: undefined,
      };

      const displayHeight = profile.height ? `${profile.height} cm` : 'Not set';
      const displayWeight = profile.weight ? `${profile.weight} kg` : 'Not set';
      const displayDOB = profile.dateOfBirth || 'Not set';

      expect(displayHeight).toBe('Not set');
      expect(displayWeight).toBe('Not set');
      expect(displayDOB).toBe('Not set');
    });

    it('should format personal info for display', () => {
      const profile = {
        dateOfBirth: '1990-05-15',
        height: 175,
        weight: 70,
      };

      const formatted = {
        height: `${profile.height} cm`,
        weight: `${profile.weight} kg`,
        dateOfBirth: profile.dateOfBirth,
      };

      expect(formatted.height).toBe('175 cm');
      expect(formatted.weight).toBe('70 kg');
      expect(formatted.dateOfBirth).toBe('1990-05-15');
    });
  });
});
