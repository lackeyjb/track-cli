import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newCommand } from '../new.js';
import { initCommand } from '../init.js';
import { getTrack, getRootTrack, getAllTrackFiles } from '../../storage/database.js';
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
        const root = getRootTrack();

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
        const root = getRootTrack();

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
        const root = getRootTrack();

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

        const track = getTrack(trackId!);

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

        const track = getTrack(trackId!);
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

        const fileMap = getAllTrackFiles();
        const files = fileMap.get(trackId!);

        expect(files).toBeDefined();
        expect(files).toHaveLength(2);
        expect(files).toContain('src/file1.ts');
        expect(files).toContain('src/file2.ts');
      });
    });

    it('should create track without parent (root level)', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Root level track', {
          summary: 'Test',
          next: 'Next',
        });

        const logs = consoleMock.getLogs();
        const trackIdLog = logs.find((log) => log.includes('Track ID:'));
        const trackId = trackIdLog?.split('Track ID: ')[1];

        const track = getTrack(trackId!);
        expect(track?.parent_id).toBeNull();
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

        const track = getTrack(trackId!);
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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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
});
