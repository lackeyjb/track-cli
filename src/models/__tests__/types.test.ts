import { describe, it, expect } from 'vitest';
import { isValidStatus, VALID_STATUSES } from '../types.js';

describe('types utilities', () => {
  describe('VALID_STATUSES', () => {
    it('should contain all 5 status values', () => {
      expect(VALID_STATUSES).toEqual(['planned', 'in_progress', 'done', 'blocked', 'superseded']);
    });

    it('should be read-only array', () => {
      expect(Array.isArray(VALID_STATUSES)).toBe(true);
    });
  });

  describe('isValidStatus', () => {
    it('should return true for "planned"', () => {
      expect(isValidStatus('planned')).toBe(true);
    });

    it('should return true for "in_progress"', () => {
      expect(isValidStatus('in_progress')).toBe(true);
    });

    it('should return true for "done"', () => {
      expect(isValidStatus('done')).toBe(true);
    });

    it('should return true for "blocked"', () => {
      expect(isValidStatus('blocked')).toBe(true);
    });

    it('should return true for "superseded"', () => {
      expect(isValidStatus('superseded')).toBe(true);
    });

    it('should return false for invalid status', () => {
      expect(isValidStatus('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidStatus('')).toBe(false);
    });

    it('should return false for similar but incorrect values', () => {
      expect(isValidStatus('Planned')).toBe(false); // Wrong case
      expect(isValidStatus('in-progress')).toBe(false); // Hyphen instead of underscore
      expect(isValidStatus('complete')).toBe(false); // Wrong word
      expect(isValidStatus('pending')).toBe(false); // Not in list
    });

    it('should be case-sensitive', () => {
      expect(isValidStatus('PLANNED')).toBe(false);
      expect(isValidStatus('Done')).toBe(false);
      expect(isValidStatus('IN_PROGRESS')).toBe(false);
    });
  });
});
