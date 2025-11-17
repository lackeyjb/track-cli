import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCurrentTimestamp } from '../timestamp.js';

describe('timestamp utilities', () => {
  describe('getCurrentTimestamp', () => {
    it('should return ISO 8601 UTC timestamp', () => {
      const timestamp = getCurrentTimestamp();
      // Should match ISO 8601 format: YYYY-MM-DDTHH:MM:SS.SSSZ
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should end with Z (UTC timezone)', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toMatch(/Z$/);
    });

    it('should return current time', () => {
      const before = new Date();
      const timestamp = getCurrentTimestamp();
      const after = new Date();

      const parsed = new Date(timestamp);
      expect(parsed.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(parsed.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should produce sortable timestamps', () => {
      const timestamps: string[] = [];

      // Generate multiple timestamps with small delays
      for (let i = 0; i < 5; i++) {
        timestamps.push(getCurrentTimestamp());
      }

      // When sorted as strings, they should be in chronological order
      const sorted = [...timestamps].sort();
      expect(sorted).toEqual(timestamps);
    });
  });

  describe('getCurrentTimestamp with mocked Date', () => {
    beforeEach(() => {
      // Mock Date to return a fixed time
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:30:45.678Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return mocked timestamp', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toBe('2025-01-15T12:30:45.678Z');
    });
  });
});
