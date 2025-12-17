import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newCommand } from '../new.js';
import { initCommand } from '../init.js';
import { getDatabasePath } from '../../utils/paths.js';
import * as lib from '../../lib/db.js';
import { withTempDir } from '../../__tests__/helpers/test-fs.js';
import { mockConsole, mockProcessExit } from '../../__tests__/helpers/mocks.js';

describe('new command', () => {
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

  describe('successful track creation', () => {
    it('should create track with minimal options', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        // Reset mocks after init
        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('New Feature', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes('Created track: New Feature'))).toBe(true);
      });
    });

    it('should create track with all options', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Feature with files', {
          parent: root?.id,
          summary: 'Test summary',
          next: 'Test next',
          file: ['file1.ts', 'file2.ts'],
        });

        const logs = consoleMock.getLogs();

        expect(logs.some((log) => log.includes('Created track: Feature with files'))).toBe(true);
        expect(logs.some((log) => log.includes('Track ID:'))).toBe(true);
        expect(logs.some((log) => log.includes(`Parent: ${root?.id}`))).toBe(true);
        expect(logs.some((log) => log.includes('Files: 2 file(s) associated'))).toBe(true);
      });
    });

    it('should store track in database', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          parent: root?.id,
          summary: 'Summary',
          next: 'Next',
        });

        // Extract track ID from console output
        const logs = consoleMock.getLogs();
        const trackIdLog = logs.find((log) => log.includes('Track ID:'));
        const trackId = trackIdLog?.split('Track ID: ')[1];

        expect(trackId).toBeDefined();

        const track = lib.getTrack(getDatabasePath(), trackId!);

        expect(track).toBeDefined();
        expect(track?.title).toBe('Test Track');
        expect(track?.parent_id).toBe(root?.id);
        expect(track?.summary).toBe('Summary');
        expect(track?.next_prompt).toBe('Next');
        expect(track?.status).toBe('planned');
      });
    });

    it('should trim whitespace from title', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('  Whitespace Title  ', {
          summary: '',
          next: '',
        });

        const logs = consoleMock.getLogs();
        const trackIdLog = logs.find((log) => log.includes('Track ID:'));
        const trackId = trackIdLog?.split('Track ID: ')[1];

        const track = lib.getTrack(getDatabasePath(), trackId!);
        expect(track?.title).toBe('Whitespace Title');
      });
    });

    it('should associate files with track', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track with files', {
          summary: '',
          next: '',
          file: ['src/file1.ts', 'src/file2.ts'],
        });

        const logs = consoleMock.getLogs();
        const trackIdLog = logs.find((log) => log.includes('Track ID:'));
        const trackId = trackIdLog?.split('Track ID: ')[1];

        const fileMap = lib.getAllTrackFiles(getDatabasePath());
        const files = fileMap.get(trackId!);

        expect(files).toBeDefined();
        expect(files).toHaveLength(2);
        expect(files).toContain('src/file1.ts');
        expect(files).toContain('src/file2.ts');
      });
    });

    it('should default to root as parent when --parent is omitted', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Feature without explicit parent', {
          summary: 'Test',
          next: 'Next',
        });

        const logs = consoleMock.getLogs();
        const trackIdLog = logs.find((log) => log.includes('Track ID:'));
        const trackId = trackIdLog?.split('Track ID: ')[1];

        const track = lib.getTrack(getDatabasePath(), trackId!);
        expect(track?.parent_id).toBe(root?.id);
        expect(track?.parent_id).not.toBeNull();
      });
    });

    it('should default to planned status', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('New Track', {
          summary: '',
          next: '',
        });

        const logs = consoleMock.getLogs();
        const trackIdLog = logs.find((log) => log.includes('Track ID:'));
        const trackId = trackIdLog?.split('Track ID: ')[1];

        const track = lib.getTrack(getDatabasePath(), trackId!);
        expect(track?.status).toBe('planned');
      });
    });
  });

  describe('validation errors', () => {
    it('should exit with error when project not initialized', async () => {
      await withTempDir(() => {
        try {
          newCommand('Test', {
            summary: '',
            next: '',
          });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('No track project found'))).toBe(true);
        expect(errors.some((err) => err.includes('Run "track init" first'))).toBe(true);
      });
    });

    it('should exit with error when title is empty', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          newCommand('', {
            summary: '',
            next: '',
          });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('title cannot be empty'))).toBe(true);
      });
    });

    it('should exit with error when title is only whitespace', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          newCommand('   ', {
            summary: '',
            next: '',
          });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);
      });
    });

    it('should exit with error when parent_id does not exist', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          newCommand('Test Track', {
            parent: 'nonexistent',
            summary: '',
            next: '',
          });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('Unknown track id: nonexistent'))).toBe(true);
        expect(errors.some((err) => err.includes('parent track does not exist'))).toBe(true);
      });
    });
  });

  describe('dependency support', () => {
    it('should create track with --blocks dependency', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create track to be blocked
        newCommand('To Be Blocked', {
          parent: root?.id,
          summary: 'Will be blocked',
          next: 'Waiting',
        });

        const toBeBlockedId = consoleMock
          .getLogs()
          .find((log) => log.includes('Track ID:'))
          ?.split('Track ID: ')[1];

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocking track
        newCommand('Blocker', {
          parent: root?.id,
          summary: 'Blocks another',
          next: 'Do first',
          blocks: [toBeBlockedId!],
        });

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes('Created track: Blocker'))).toBe(true);
        expect(logs.some((log) => log.includes(`Blocks: ${toBeBlockedId}`))).toBe(true);

        // Verify dependency was created
        const blockers = lib.getBlockersOf(getDatabasePath(), toBeBlockedId!);
        expect(blockers).toHaveLength(1);
      });
    });

    it('should auto-set blocked track to "blocked" status when initially "planned"', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create track with "planned" status (default)
        newCommand('Planned Track', {
          parent: root?.id,
          summary: 'Initially planned',
          next: 'Will be blocked',
        });

        const plannedId = consoleMock
          .getLogs()
          .find((log) => log.includes('Track ID:'))
          ?.split('Track ID: ')[1];

        // Verify initially planned
        let track = lib.getTrack(getDatabasePath(), plannedId!);
        expect(track?.status).toBe('planned');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocking track
        newCommand('Blocker', {
          parent: root?.id,
          summary: 'Blocks the planned track',
          next: 'Do first',
          blocks: [plannedId!],
        });

        // Verify track is now blocked
        track = lib.getTrack(getDatabasePath(), plannedId!);
        expect(track?.status).toBe('blocked');
      });
    });

    it('should exit with error when blocked track does not exist', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          newCommand('Blocker', {
            summary: 'Blocks nonexistent',
            next: 'Next',
            blocks: ['NONEXISTENT'],
          });
        } catch {
          // Expected
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('Unknown track id: NONEXISTENT'))).toBe(true);
      });
    });

    it('should support multiple --blocks dependencies', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create two tracks to be blocked
        newCommand('Track A', {
          parent: root?.id,
          summary: 'A',
          next: 'A',
        });

        const trackAId = consoleMock
          .getLogs()
          .find((log) => log.includes('Track ID:'))
          ?.split('Track ID: ')[1];

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track B', {
          parent: root?.id,
          summary: 'B',
          next: 'B',
        });

        const trackBId = consoleMock
          .getLogs()
          .find((log) => log.includes('Track ID:'))
          ?.split('Track ID: ')[1];

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create blocker that blocks both
        newCommand('Multi Blocker', {
          parent: root?.id,
          summary: 'Blocks A and B',
          next: 'Do first',
          blocks: [trackAId!, trackBId!],
        });

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes('Blocks:'))).toBe(true);

        // Verify both are blocked
        expect(lib.getBlockersOf(getDatabasePath(), trackAId!)).toHaveLength(1);
        expect(lib.getBlockersOf(getDatabasePath(), trackBId!)).toHaveLength(1);

        // Verify both have blocked status
        expect(lib.getTrack(getDatabasePath(), trackAId!)?.status).toBe('blocked');
        expect(lib.getTrack(getDatabasePath(), trackBId!)?.status).toBe('blocked');
      });
    });
  });

  describe('worktree support', () => {
    it('should accept explicit --worktree flag', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Test Track', {
          summary: 'Summary',
          next: 'Next',
          worktree: 'feature-branch',
        });

        const logs = consoleMock.getLogs();
        const trackIdLog = logs.find((log) => log.includes('Track ID:'));
        const trackId = trackIdLog?.split('Track ID: ')[1];

        const track = lib.getTrack(getDatabasePath(), trackId!);
        expect(track?.worktree).toBe('feature-branch');

        // Check console output includes worktree
        expect(logs.some((log) => log.includes('Worktree: feature-branch'))).toBe(true);
      });
    });

    it('should store null worktree when not specified in non-git directory', async () => {
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

        const logs = consoleMock.getLogs();
        const trackIdLog = logs.find((log) => log.includes('Track ID:'));
        const trackId = trackIdLog?.split('Track ID: ')[1];

        const track = lib.getTrack(getDatabasePath(), trackId!);
        // In a non-git temp directory, worktree should be null
        expect(track?.worktree).toBeNull();
      });
    });

    it('should inherit worktree from parent', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create parent with worktree
        newCommand('Parent Track', {
          summary: 'Parent',
          next: 'Next',
          worktree: 'feature-x',
        });

        const parentLogs = consoleMock.getLogs();
        const parentIdLog = parentLogs.find((log) => log.includes('Track ID:'));
        const parentId = parentIdLog?.split('Track ID: ')[1];

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create child without explicit worktree
        newCommand('Child Track', {
          parent: parentId,
          summary: 'Child',
          next: 'Next',
        });

        const childLogs = consoleMock.getLogs();
        const childIdLog = childLogs.find((log) => log.includes('Track ID:'));
        const childId = childIdLog?.split('Track ID: ')[1];

        const childTrack = lib.getTrack(getDatabasePath(), childId!);
        // Child should inherit parent's worktree
        expect(childTrack?.worktree).toBe('feature-x');
      });
    });

    it('should allow explicit worktree to override parent inheritance', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create parent with worktree
        newCommand('Parent Track', {
          summary: 'Parent',
          next: 'Next',
          worktree: 'feature-x',
        });

        const parentLogs = consoleMock.getLogs();
        const parentIdLog = parentLogs.find((log) => log.includes('Track ID:'));
        const parentId = parentIdLog?.split('Track ID: ')[1];

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create child with different explicit worktree
        newCommand('Child Track', {
          parent: parentId,
          summary: 'Child',
          next: 'Next',
          worktree: 'feature-y',
        });

        const childLogs = consoleMock.getLogs();
        const childIdLog = childLogs.find((log) => log.includes('Track ID:'));
        const childId = childIdLog?.split('Track ID: ')[1];

        const childTrack = lib.getTrack(getDatabasePath(), childId!);
        // Child should have its own worktree, not parent's
        expect(childTrack?.worktree).toBe('feature-y');
      });
    });
  });
});
