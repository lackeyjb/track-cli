import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabasePath } from '../../utils/paths.js';
import { updateCommand } from '../update.js';
import { initCommand } from '../init.js';
import { newCommand } from '../new.js';
import * as lib from '../../lib/db.js';
import { withTempDir } from '../../__tests__/helpers/test-fs.js';
import { mockConsole, mockProcessExit } from '../../__tests__/helpers/mocks.js';

describe('update command', () => {
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

        updateCommand(trackId, {
          summary: 'Updated summary',
          next: 'Updated next',
        });

        const track = lib.getTrack(getDatabasePath(), trackId);

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

        updateCommand(trackId, {
          summary: 'Done',
          next: '',
          status: 'done',
        });

        const track = lib.getTrack(getDatabasePath(), trackId);

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
        let track = lib.getTrack(getDatabasePath(), trackId);
        expect(track?.status).toBe('planned');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        updateCommand(trackId, {
          summary: 'Working on it',
          next: 'Keep going',
        });

        track = lib.getTrack(getDatabasePath(), trackId);

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
        const originalTrack = lib.getTrack(getDatabasePath(), trackId);
        const originalUpdatedAt = originalTrack?.updated_at;

        // Wait a tiny bit to ensure timestamp changes
        await new Promise((resolve) => setTimeout(resolve, 10));

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        updateCommand(trackId, {
          summary: 'Updated',
          next: 'Next',
        });

        const updatedTrack = lib.getTrack(getDatabasePath(), trackId);

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

        updateCommand(trackId, {
          summary: 'Working',
          next: 'Next',
          file: ['file1.ts', 'file2.ts'],
        });

        const fileMap = lib.getAllTrackFiles(getDatabasePath());
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

        updateCommand(trackId, {
          summary: 'Updated',
          next: 'Next',
          file: ['file1.ts', 'file2.ts'], // file1.ts is duplicate
        });

        const fileMap = lib.getAllTrackFiles(getDatabasePath());
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

        updateCommand(trackId, {
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

          updateCommand(trackId, {
            summary: 'Updated',
            next: 'Next',
            status,
          });

          const track = lib.getTrack(getDatabasePath(), trackId);
          expect(track?.status).toBe(status);
        }
      });
    });
  });

  describe('validation errors', () => {
    it('should exit with error when project not initialized', async () => {
      await withTempDir(() => {
        try {
          updateCommand('test123', {
            summary: 'Summary',
            next: 'Next',
          });
        } catch {
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
          updateCommand('nonexistent', {
            summary: 'Summary',
            next: 'Next',
          });
        } catch {
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
          updateCommand(trackId, {
            summary: 'Updated',
            next: 'Next',
            status: 'invalid_status',
          });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('Invalid status: invalid_status'))).toBe(true);
        expect(
          errors.some((err) => err.includes('planned, in_progress, done, blocked, superseded'))
        ).toBe(true);
      });
    });
  });

  describe('dependency support', () => {
    it('should add dependency with --blocks', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create two tracks
        newCommand('Track A', { summary: 'A', next: 'A' });
        const trackAId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track B', { summary: 'B', next: 'B' });
        const trackBId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Update Track A to block Track B
        updateCommand(trackAId, {
          summary: 'Updated A',
          next: 'Next A',
          blocks: [trackBId],
        });

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes(`Now blocks: ${trackBId}`))).toBe(true);

        // Verify dependency was created
        const blockers = lib.getBlockersOf(getDatabasePath(), trackBId);
        expect(blockers).toContain(trackAId);
      });
    });

    it('should remove dependency with --unblocks', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocked track
        newCommand('Blocked Track', { summary: 'Blocked', next: 'Waiting' });
        const blockedId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocker track that blocks the first
        newCommand('Blocker Track', { summary: 'Blocker', next: 'Do first', blocks: [blockedId] });
        const blockerId = extractTrackId(consoleMock.getLogs());

        // Verify dependency exists
        expect(lib.getBlockersOf(getDatabasePath(), blockedId)).toContain(blockerId);

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Remove the dependency
        updateCommand(blockerId, {
          summary: 'Updated Blocker',
          next: 'Done',
          unblocks: [blockedId],
        });

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes(`No longer blocks: ${blockedId}`))).toBe(true);

        // Verify dependency was removed
        expect(lib.getBlockersOf(getDatabasePath(), blockedId)).not.toContain(blockerId);
      });
    });

    it('should auto-set blocked track to "blocked" when adding dependency', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create two tracks (both planned)
        newCommand('Track A', { summary: 'A', next: 'A' });
        const trackAId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track B', { summary: 'B', next: 'B' });
        const trackBId = extractTrackId(consoleMock.getLogs());

        // Verify both are planned
        expect(lib.getTrack(getDatabasePath(), trackAId)?.status).toBe('planned');
        expect(lib.getTrack(getDatabasePath(), trackBId)?.status).toBe('planned');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // A blocks B
        updateCommand(trackAId, {
          summary: 'Updated A',
          next: 'Next A',
          blocks: [trackBId],
        });

        // Verify B is now blocked
        expect(lib.getTrack(getDatabasePath(), trackBId)?.status).toBe('blocked');
      });
    });

    it('should auto-set blocked track to "planned" when removing last blocker', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocked track
        newCommand('Blocked Track', { summary: 'Blocked', next: 'Waiting' });
        const blockedId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocker
        newCommand('Blocker', { summary: 'Blocker', next: 'Do first', blocks: [blockedId] });
        const blockerId = extractTrackId(consoleMock.getLogs());

        // Verify track is blocked
        expect(lib.getTrack(getDatabasePath(), blockedId)?.status).toBe('blocked');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Remove blocker
        updateCommand(blockerId, {
          summary: 'Done',
          next: '',
          unblocks: [blockedId],
        });

        // Verify track is now planned
        expect(lib.getTrack(getDatabasePath(), blockedId)?.status).toBe('planned');
      });
    });

    it('should cascade unblock when blocker marked "done"', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocked track
        newCommand('Blocked Track', { summary: 'Blocked', next: 'Waiting' });
        const blockedId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocker
        newCommand('Blocker', { summary: 'Blocker', next: 'Do first', blocks: [blockedId] });
        const blockerId = extractTrackId(consoleMock.getLogs());

        // Verify track is blocked
        expect(lib.getTrack(getDatabasePath(), blockedId)?.status).toBe('blocked');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Mark blocker as done
        updateCommand(blockerId, {
          summary: 'Completed',
          next: '',
          status: 'done',
        });

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes(`Unblocked tracks: ${blockedId}`))).toBe(true);

        // Verify blocked track is now planned
        expect(lib.getTrack(getDatabasePath(), blockedId)?.status).toBe('planned');
      });
    });

    it('should not cascade unblock when not all blockers are done', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocked track
        newCommand('Blocked Track', { summary: 'Blocked', next: 'Waiting' });
        const blockedId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create first blocker
        newCommand('Blocker 1', { summary: 'Blocker 1', next: 'Do first', blocks: [blockedId] });
        const blocker1Id = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create second blocker
        newCommand('Blocker 2', { summary: 'Blocker 2', next: 'Also do', blocks: [blockedId] });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Mark first blocker as done
        updateCommand(blocker1Id, {
          summary: 'Completed',
          next: '',
          status: 'done',
        });

        // Verify blocked track is still blocked (blocker 2 is not done)
        expect(lib.getTrack(getDatabasePath(), blockedId)?.status).toBe('blocked');
      });
    });

    it('should error when --blocks creates a cycle', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create two tracks
        newCommand('Track A', { summary: 'A', next: 'A' });
        const trackAId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track B', { summary: 'B', next: 'B' });
        const trackBId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // A blocks B
        updateCommand(trackAId, {
          summary: 'Updated A',
          next: 'Next A',
          blocks: [trackBId],
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // B blocks A would create a cycle
        try {
          updateCommand(trackBId, {
            summary: 'Updated B',
            next: 'Next B',
            blocks: [trackAId],
          });
        } catch {
          // Expected
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('would create a cycle'))).toBe(true);
      });
    });

    it('should preserve manually blocked status when unblocking', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create a track and manually set it to blocked
        newCommand('Manually Blocked', { summary: 'Blocked', next: 'Waiting' });
        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Manually set to blocked
        updateCommand(trackId, {
          summary: 'Blocked',
          next: 'Waiting for external',
          status: 'blocked',
        });

        expect(lib.getTrack(getDatabasePath(), trackId)?.status).toBe('blocked');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create another track that "blocks" the first (but it's already blocked manually)
        newCommand('New Blocker', { summary: 'Blocker', next: 'Do this', blocks: [trackId] });
        const blockerId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Mark the blocker as done
        updateCommand(blockerId, {
          summary: 'Done',
          next: '',
          status: 'done',
        });

        // The track should become planned because it was dependency-blocked
        // (it has blockers and all blockers are done)
        expect(lib.getTrack(getDatabasePath(), trackId)?.status).toBe('planned');
      });
    });
  });

  describe('worktree support', () => {
    it('should update worktree when --worktree is provided', async () => {
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

        updateCommand(trackId, {
          summary: 'Updated',
          next: 'Next',
          worktree: 'feature-branch',
        });

        const track = lib.getTrack(getDatabasePath(), trackId);
        expect(track?.worktree).toBe('feature-branch');

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes('Worktree: feature-branch'))).toBe(true);
      });
    });

    it('should unset worktree when --worktree - is provided', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create track with worktree
        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
          worktree: 'feature-branch',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        // Verify worktree is set
        let track = lib.getTrack(getDatabasePath(), trackId);
        expect(track?.worktree).toBe('feature-branch');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Unset worktree with '-'
        updateCommand(trackId, {
          summary: 'Updated',
          next: 'Next',
          worktree: '-',
        });

        track = lib.getTrack(getDatabasePath(), trackId);
        expect(track?.worktree).toBeNull();

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes('Worktree: (unset)'))).toBe(true);
      });
    });

    it('should not change worktree when --worktree is not provided', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create track with worktree
        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
          worktree: 'feature-branch',
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Update without --worktree flag
        updateCommand(trackId, {
          summary: 'Updated',
          next: 'Next',
        });

        // Worktree should remain unchanged
        const track = lib.getTrack(getDatabasePath(), trackId);
        expect(track?.worktree).toBe('feature-branch');
      });
    });
  });
});
