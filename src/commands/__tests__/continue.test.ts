import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { continueCommand } from '../continue.js';
import { initCommand } from '../init.js';
import { newCommand } from '../new.js';
import { getTrack, getAllTrackFiles } from '../../storage/database.js';
import { withTempDir } from '../../__tests__/helpers/test-fs.js';
import { mockConsole, mockProcessExit } from '../../__tests__/helpers/mocks.js';

describe('continue command', () => {
  let consoleMock: ReturnType<typeof mockConsole>;
  let exitMock: ReturnType<typeof mockProcessExit>;

  beforeEach(() => {
    consoleMock = mockConsole();
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    consoleMock.restore();
    exitMock.restore();
  });

  function extractTrackId(logs: string[]): string {
    const trackIdLog = logs.find((log) => log.includes('Track ID:'));
    const trackId = trackIdLog?.split('Track ID: ')[1];
    return trackId || '';
  }

  describe('successful track update', () => {
    it('should update track summary and next_prompt', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Original summary',
          next: 'Original next',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        continueCommand(trackId, {
          summary: 'Updated summary',
          next: 'Updated next',
        });

        const track = getTrack(trackId);

        expect(track?.summary).toBe('Updated summary');
        expect(track?.next_prompt).toBe('Updated next');
      });
    });

    it('should update track status', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        continueCommand(trackId, {
          summary: 'Done',
          next: '',
          status: 'done',
        });

        const track = getTrack(trackId);

        expect(track?.status).toBe('done');
      });
    });

    it('should default to in_progress status when not specified', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        // Verify initially planned
        let track = getTrack(trackId);
        expect(track?.status).toBe('planned');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        continueCommand(trackId, {
          summary: 'Working on it',
          next: 'Keep going',
        });

        track = getTrack(trackId);

        expect(track?.status).toBe('in_progress');
      });
    });

    it('should update updated_at timestamp', async () => {
      await withTempDir(async () => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
        });

        const trackId = extractTrackId(consoleMock.getLogs());
        const originalTrack = getTrack(trackId);
        const originalUpdatedAt = originalTrack?.updated_at;

        // Wait a tiny bit to ensure timestamp changes
        await new Promise((resolve) => setTimeout(resolve, 10));

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        continueCommand(trackId, {
          summary: 'Updated',
          next: 'Next',
        });

        const updatedTrack = getTrack(trackId);

        expect(updatedTrack?.updated_at).not.toBe(originalUpdatedAt);
      });
    });

    it('should associate files with track', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        continueCommand(trackId, {
          summary: 'Working',
          next: 'Next',
          file: ['file1.ts', 'file2.ts'],
        });

        const fileMap = getAllTrackFiles();
        const files = fileMap.get(trackId);

        expect(files).toBeDefined();
        expect(files).toHaveLength(2);
        expect(files).toContain('file1.ts');
        expect(files).toContain('file2.ts');
      });
    });

    it('should add files idempotently (no duplicates)', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
          file: ['file1.ts'],
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        continueCommand(trackId, {
          summary: 'Updated',
          next: 'Next',
          file: ['file1.ts', 'file2.ts'], // file1.ts is duplicate
        });

        const fileMap = getAllTrackFiles();
        const files = fileMap.get(trackId);

        expect(files).toHaveLength(2); // Should have file1.ts and file2.ts
      });
    });

    it('should print success messages', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        continueCommand(trackId, {
          summary: 'Updated',
          next: 'Next',
          status: 'done',
          file: ['file1.ts'],
        });

        const logs = consoleMock.getLogs();

        expect(logs.some((log) => log.includes(`Updated track: ${trackId}`))).toBe(true);
        expect(logs.some((log) => log.includes('Status: done'))).toBe(true);
        expect(logs.some((log) => log.includes('Files: 1 file(s) associated'))).toBe(true);
      });
    });

    it('should support all valid statuses', async () => {
      await withTempDir(() => {
        const statuses = ['planned', 'in_progress', 'done', 'blocked', 'superseded'];

        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        for (const status of statuses) {
          consoleMock.restore();
          exitMock.restore();
          consoleMock = mockConsole();
          exitMock = mockProcessExit();

          continueCommand(trackId, {
            summary: 'Updated',
            next: 'Next',
            status,
          });

          const track = getTrack(trackId);
          expect(track?.status).toBe(status);
        }
      });
    });
  });

  describe('validation errors', () => {
    it('should exit with error when project not initialized', async () => {
      await withTempDir(() => {
        try {
          continueCommand('test123', {
            summary: 'Summary',
            next: 'Next',
          });
        } catch (error) {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('No track project found'))).toBe(true);
      });
    });

    it('should exit with error when track does not exist', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          continueCommand('nonexistent', {
            summary: 'Summary',
            next: 'Next',
          });
        } catch (error) {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('Unknown track id: nonexistent'))).toBe(true);
      });
    });

    it('should exit with error when status is invalid', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          continueCommand(trackId, {
            summary: 'Updated',
            next: 'Next',
            status: 'invalid_status',
          });
        } catch (error) {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('Invalid status: invalid_status'))).toBe(true);
        expect(
          errors.some((err) =>
            err.includes('planned, in_progress, done, blocked, superseded')
          )
        ).toBe(true);
      });
    });
  });
});
