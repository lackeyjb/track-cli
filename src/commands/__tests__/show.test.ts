import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showCommand } from '../show.js';
import { initCommand } from '../init.js';
import { newCommand } from '../new.js';
import { updateCommand } from '../update.js';
import { getDatabasePath } from '../../utils/paths.js';
import * as lib from '../../lib/db.js';
import { withTempDir } from '../../__tests__/helpers/test-fs.js';
import { mockConsole, mockProcessExit } from '../../__tests__/helpers/mocks.js';

describe('show command', () => {
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

  describe('JSON output', () => {
    it('should output valid JSON for a single track', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(root!.id, { json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = logs.join('\n');

        expect(() => JSON.parse(jsonOutput)).not.toThrow();
      });
    });

    it('should include all track fields in JSON output', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Feature Track', {
          parent: root?.id,
          summary: 'Feature summary',
          next: 'Next step',
        });

        const featureId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(featureId, { json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        expect(jsonOutput).toMatchObject({
          id: featureId,
          title: 'Feature Track',
          parent_id: root?.id,
          summary: 'Feature summary',
          next_prompt: 'Next step',
          status: expect.any(String),
          kind: expect.any(String),
          files: expect.any(Array),
          children: expect.any(Array),
          created_at: expect.any(String),
          updated_at: expect.any(String),
        });
      });
    });

    it('should show root track with kind "super"', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create a child so root becomes super
        newCommand('Child', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(root!.id, { json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        expect(jsonOutput.kind).toBe('super');
        expect(jsonOutput.parent_id).toBeNull();
      });
    });

    it('should show feature track with kind "feature"', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Feature', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        const featureId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        // Create child under feature to make it a "feature" kind
        newCommand('Task', {
          parent: featureId,
          summary: '',
          next: '',
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(featureId, { json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        expect(jsonOutput.kind).toBe('feature');
      });
    });

    it('should show task track with kind "task"', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Task', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        const taskId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(taskId, { json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        expect(jsonOutput.kind).toBe('task');
      });
    });

    it('should include files in JSON output', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track with files', {
          summary: '',
          next: '',
          file: ['file1.ts', 'file2.ts'],
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(trackId, { json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        expect(jsonOutput.files).toEqual(['file1.ts', 'file2.ts']);
      });
    });

    it('should include children array', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Child 1', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        const child1Id = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Child 2', {
          parent: root?.id,
          summary: '',
          next: '',
        });

        const child2Id = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(root!.id, { json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        expect(jsonOutput.children).toContain(child1Id);
        expect(jsonOutput.children).toContain(child2Id);
      });
    });
  });

  describe('human-readable output', () => {
    it('should display track kind in brackets', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(root!.id, { json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).toContain('[super]');
      });
    });

    it('should display track ID and title', async () => {
      await withTempDir(() => {
        initCommand('My Project');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(root!.id, { json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).toContain(root!.id);
        expect(output).toContain('My Project');
      });
    });

    it('should display track details with labels', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        updateCommand(root!.id, {
          summary: 'Project summary',
          next: 'Next step',
          status: 'in_progress',
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(root!.id, { json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).toContain('summary: Project summary');
        expect(output).toContain('next:    Next step');
        expect(output).toContain('status:  in_progress');
      });
    });

    it('should display files when present', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track with files', {
          summary: '',
          next: '',
          file: ['file1.ts', 'file2.ts'],
        });

        const trackId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(trackId, { json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).toContain('files:   file1.ts, file2.ts');
      });
    });

    it('should not display files line when no files', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = lib.getRootTrack(getDatabasePath());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        showCommand(root!.id, { json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).not.toContain('files:');
      });
    });
  });

  describe('error handling', () => {
    it('should exit with error when project not initialized', async () => {
      await withTempDir(() => {
        try {
          showCommand('abc12345', { json: false });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('No track project found'))).toBe(true);
      });
    });

    it('should exit with error when track ID not found', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        try {
          showCommand('invalid123', { json: false });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('Unknown track id: invalid123'))).toBe(true);
      });
    });
  });
});
