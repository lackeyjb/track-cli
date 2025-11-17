import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { statusCommand } from '../status.js';
import { initCommand } from '../init.js';
import { newCommand } from '../new.js';
import { continueCommand } from '../continue.js';
import { getRootTrack } from '../../storage/database.js';
import { withTempDir } from '../../__tests__/helpers/test-fs.js';
import { mockConsole, mockProcessExit } from '../../__tests__/helpers/mocks.js';

describe('status command', () => {
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
    it('should output valid JSON', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = logs.join('\n');

        expect(() => JSON.parse(jsonOutput)).not.toThrow();
      });
    });

    it('should include tracks array in JSON output', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        expect(jsonOutput).toHaveProperty('tracks');
        expect(Array.isArray(jsonOutput.tracks)).toBe(true);
      });
    });

    it('should include all track fields in JSON output', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = getRootTrack();

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Feature Track', {
          parent: root?.id,
          summary: 'Feature summary',
          next: 'Next step',
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        expect(jsonOutput.tracks).toHaveLength(2);

        const rootTrack = jsonOutput.tracks.find((t: any) => t.parent_id === null);
        expect(rootTrack).toMatchObject({
          id: expect.any(String),
          title: 'Test Project',
          parent_id: null,
          kind: 'super',
          summary: expect.any(String),
          next_prompt: expect.any(String),
          status: expect.any(String),
          files: expect.any(Array),
          children: expect.any(Array),
          created_at: expect.any(String),
          updated_at: expect.any(String),
        });
      });
    });

    it('should include derived kind field', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = getRootTrack();

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

        newCommand('Task', {
          parent: featureId,
          summary: '',
          next: '',
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        const rootTrack = jsonOutput.tracks.find((t: any) => t.parent_id === null);
        const featureTrack = jsonOutput.tracks.find((t: any) => t.id === featureId);
        const taskTrack = jsonOutput.tracks.find((t: any) => t.parent_id === featureId);

        expect(rootTrack.kind).toBe('super');
        expect(featureTrack.kind).toBe('feature');
        expect(taskTrack.kind).toBe('task');
      });
    });

    it('should include children array with correct child IDs', async () => {
      await withTempDir(() => {
        initCommand('Test Project');
        const root = getRootTrack();

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

        statusCommand({ json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        const rootTrack = jsonOutput.tracks.find((t: any) => t.parent_id === null);

        expect(rootTrack.children).toContain(child1Id);
        expect(rootTrack.children).toContain(child2Id);
      });
    });

    it('should include files array', async () => {
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

        statusCommand({ json: true });

        const logs = consoleMock.getLogs();
        const jsonOutput = JSON.parse(logs.join('\n'));

        const track = jsonOutput.tracks.find((t: any) => t.id === trackId);

        expect(track.files).toEqual(['file1.ts', 'file2.ts']);
      });
    });
  });

  describe('human-readable output', () => {
    it('should display project name and ID', async () => {
      await withTempDir(() => {
        initCommand('My Project');
        const root = getRootTrack();

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).toContain(`Project: My Project (${root?.id})`);
      });
    });

    it('should display track kind in brackets', async () => {
      await withTempDir(() => {
        initCommand('Test');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).toContain('[super]');
      });
    });

    it('should display track details with indentation', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = getRootTrack();

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        continueCommand(root!.id, {
          summary: 'Project summary',
          next: 'Next step',
          status: 'in_progress',
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: false });

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
        const root = getRootTrack();

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Track', {
          parent: root?.id, // Make it a child of root so it shows in tree
          summary: '',
          next: '',
          file: ['file1.ts', 'file2.ts'],
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).toContain('files:   file1.ts, file2.ts');
      });
    });

    it('should display hierarchical tree structure', async () => {
      await withTempDir(() => {
        initCommand('Test');
        const root = getRootTrack();

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Feature', {
          parent: root?.id,
          summary: 'Feature summary',
          next: 'Feature next',
        });

        const featureId = extractTrackId(consoleMock.getLogs());

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        newCommand('Task', {
          parent: featureId,
          summary: 'Task summary',
          next: 'Task next',
        });

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        // Check for super track (no indentation for content)
        expect(output).toContain('[super]');

        // Check for feature track (2-space indentation)
        expect(output).toContain('  [feature]');

        // Check for task track (4-space indentation)
        expect(output).toContain('    [task]');
      });
    });

    it('should handle empty project', async () => {
      await withTempDir(() => {
        initCommand('Empty Project');

        consoleMock.restore();
        exitMock.restore();
        consoleMock = mockConsole();
        exitMock = mockProcessExit();

        statusCommand({ json: false });

        const logs = consoleMock.getLogs();
        const output = logs.join('\n');

        expect(output).toContain('Project: Empty Project');
        expect(output).toContain('[super]');
      });
    });
  });

  describe('error handling', () => {
    it('should exit with error when project not initialized', async () => {
      await withTempDir(() => {
        try {
          statusCommand({ json: false });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('No track project found'))).toBe(true);
      });
    });
  });
});
