import { describe, it, expect } from 'vitest';
import { getTrackDir, getDatabasePath, projectExists } from '../paths.js';
import { withTempDir, createTrackDir } from '../../__tests__/helpers/test-fs.js';
import path from 'path';

describe('paths utilities', () => {
  describe('getTrackDir', () => {
    it('should return .track directory path in current working directory', async () => {
      await withTempDir(() => {
        const trackDir = getTrackDir();
        // Use endsWith to handle /private/var vs /var on macOS
        expect(trackDir.endsWith(path.join('.track'))).toBe(true);
        expect(path.basename(trackDir)).toBe('.track');
      });
    });
  });

  describe('getDatabasePath', () => {
    it('should return track.db path inside .track directory', async () => {
      await withTempDir(() => {
        const dbPath = getDatabasePath();
        // Use endsWith to handle /private/var vs /var on macOS
        expect(dbPath.endsWith(path.join('.track', 'track.db'))).toBe(true);
        expect(path.basename(dbPath)).toBe('track.db');
      });
    });
  });

  describe('projectExists', () => {
    it('should return false when .track directory does not exist', async () => {
      await withTempDir(() => {
        expect(projectExists()).toBe(false);
      });
    });

    it('should return true when .track directory exists', async () => {
      await withTempDir((tempDir) => {
        createTrackDir(tempDir);
        expect(projectExists()).toBe(true);
      });
    });
  });
});
