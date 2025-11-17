import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initCommand } from '../init.js';
import { projectExists } from '../../utils/paths.js';
import { getRootTrack } from '../../storage/database.js';
import { withTempDir } from '../../__tests__/helpers/test-fs.js';
import { mockConsole, mockProcessExit } from '../../__tests__/helpers/mocks.js';
import path from 'path';
import fs from 'fs';

describe('init command', () => {
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

  describe('successful initialization', () => {
    it('should create .track directory', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        expect(projectExists()).toBe(true);
        expect(fs.existsSync('.track')).toBe(true);
      });
    });

    it('should create track.db database', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        expect(fs.existsSync('.track/track.db')).toBe(true);
      });
    });

    it('should create root track with provided name', async () => {
      await withTempDir(() => {
        initCommand('My Project');

        const root = getRootTrack();

        expect(root).toBeDefined();
        expect(root?.title).toBe('My Project');
        expect(root?.parent_id).toBeNull();
        expect(root?.status).toBe('planned');
      });
    });

    it('should use directory name when no name provided', async () => {
      await withTempDir((tempDir) => {
        const dirName = path.basename(tempDir);

        initCommand(); // No name provided

        const root = getRootTrack();

        expect(root?.title).toBe(dirName);
      });
    });

    it('should generate ID for root track', async () => {
      await withTempDir(() => {
        initCommand('Test');

        const root = getRootTrack();

        expect(root?.id).toBeDefined();
        expect(root?.id.length).toBe(8);
      });
    });

    it('should set timestamps for root track', async () => {
      await withTempDir(() => {
        initCommand('Test');

        const root = getRootTrack();

        expect(root?.created_at).toBeDefined();
        expect(root?.updated_at).toBeDefined();
        expect(root?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    it('should print success messages', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        const logs = consoleMock.getLogs();

        expect(logs.some((log) => log.includes('Initialized track project: Test Project'))).toBe(
          true
        );
        expect(logs.some((log) => log.includes('Project ID:'))).toBe(true);
        expect(logs.some((log) => log.includes('Database: .track/track.db'))).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('should exit with error when project already exists', async () => {
      await withTempDir(() => {
        // Initialize once
        initCommand('Test');

        // Reset mocks
        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Try to initialize again
        try {
          initCommand('Test2');
        } catch (error) {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('already exists'))).toBe(true);
      });
    });

    it('should show helpful error message when project exists', async () => {
      await withTempDir(() => {
        initCommand('Test');

        // Reset mocks
        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          initCommand('Test2');
        } catch (error) {
          // Expected to throw due to process.exit mock
        }

        const errors = consoleMock.getErrors();

        expect(errors.some((err) => err.includes('already exists'))).toBe(true);
        expect(errors.some((err) => err.includes('.track/ directory is already present'))).toBe(
          true
        );
        expect(errors.some((err) => err.includes('Use --force'))).toBe(true);
      });
    });
  });

  describe('force flag', () => {
    it('should remove existing .track directory when force is true', async () => {
      await withTempDir(() => {
        // Initialize once
        initCommand('First Project');
        const firstRoot = getRootTrack();

        // Initialize again with force
        initCommand('Second Project', true);
        const secondRoot = getRootTrack();

        expect(secondRoot?.title).toBe('Second Project');
        expect(secondRoot?.id).not.toBe(firstRoot?.id); // Different project
      });
    });

    it('should log message when removing existing directory', async () => {
      await withTempDir(() => {
        initCommand('First');

        // Reset mocks
        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        initCommand('Second', true);

        const logs = consoleMock.getLogs();
        expect(logs.some((log) => log.includes('Removing existing .track directory'))).toBe(true);
      });
    });

    it('should not exit when force is true and project exists', async () => {
      await withTempDir(() => {
        initCommand('First');

        // Reset mocks
        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        initCommand('Second', true);

        expect(exitMock.wasExitCalled()).toBe(false);
      });
    });
  });
});
