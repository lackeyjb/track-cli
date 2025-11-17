import { describe, it, expect } from 'vitest';
import { buildTrackTree } from '../tree.js';
import type { Track } from '../types.js';

describe('tree building', () => {
  describe('buildTrackTree', () => {
    it('should handle empty track list', () => {
      const result = buildTrackTree([], new Map());
      expect(result).toEqual([]);
    });

    it('should derive "super" kind for root track (parent_id = null)', () => {
      const tracks: Track[] = [
        {
          id: 'root123',
          title: 'My Project',
          parent_id: null,
          summary: 'Project summary',
          next_prompt: 'Next step',
          status: 'in_progress',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ];

      const result = buildTrackTree(tracks, new Map());

      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('super');
      expect(result[0].children).toEqual([]);
      expect(result[0].files).toEqual([]);
    });

    it('should derive "task" kind for leaf track (has parent, no children)', () => {
      const tracks: Track[] = [
        {
          id: 'root123',
          title: 'My Project',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'task456',
          title: 'Implement feature',
          parent_id: 'root123',
          summary: 'Task summary',
          next_prompt: 'Do it',
          status: 'in_progress',
          created_at: '2025-01-01T00:01:00.000Z',
          updated_at: '2025-01-01T00:01:00.000Z',
        },
      ];

      const result = buildTrackTree(tracks, new Map());

      expect(result).toHaveLength(2);

      const root = result.find((t) => t.id === 'root123');
      const task = result.find((t) => t.id === 'task456');

      expect(root?.kind).toBe('super');
      expect(root?.children).toEqual(['task456']);

      expect(task?.kind).toBe('task');
      expect(task?.children).toEqual([]);
    });

    it('should derive "feature" kind for track with parent and children', () => {
      const tracks: Track[] = [
        {
          id: 'root123',
          title: 'My Project',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'feature1',
          title: 'Auth Feature',
          parent_id: 'root123',
          summary: 'Feature summary',
          next_prompt: 'Next',
          status: 'in_progress',
          created_at: '2025-01-01T00:01:00.000Z',
          updated_at: '2025-01-01T00:01:00.000Z',
        },
        {
          id: 'task1',
          title: 'Login form',
          parent_id: 'feature1',
          summary: 'Task summary',
          next_prompt: 'Do it',
          status: 'in_progress',
          created_at: '2025-01-01T00:02:00.000Z',
          updated_at: '2025-01-01T00:02:00.000Z',
        },
      ];

      const result = buildTrackTree(tracks, new Map());

      const feature = result.find((t) => t.id === 'feature1');

      expect(feature?.kind).toBe('feature');
      expect(feature?.children).toEqual(['task1']);
    });

    it('should handle complex tree with multiple levels', () => {
      const tracks: Track[] = [
        {
          id: 'root',
          title: 'Project',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'feature1',
          title: 'Feature 1',
          parent_id: 'root',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:01:00.000Z',
          updated_at: '2025-01-01T00:01:00.000Z',
        },
        {
          id: 'feature2',
          title: 'Feature 2',
          parent_id: 'root',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:02:00.000Z',
          updated_at: '2025-01-01T00:02:00.000Z',
        },
        {
          id: 'task1',
          title: 'Task 1',
          parent_id: 'feature1',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:03:00.000Z',
          updated_at: '2025-01-01T00:03:00.000Z',
        },
        {
          id: 'task2',
          title: 'Task 2',
          parent_id: 'feature1',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:04:00.000Z',
          updated_at: '2025-01-01T00:04:00.000Z',
        },
        {
          id: 'task3',
          title: 'Task 3',
          parent_id: 'feature2',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:05:00.000Z',
          updated_at: '2025-01-01T00:05:00.000Z',
        },
      ];

      const result = buildTrackTree(tracks, new Map());

      const root = result.find((t) => t.id === 'root');
      const feature1 = result.find((t) => t.id === 'feature1');
      const feature2 = result.find((t) => t.id === 'feature2');
      const task1 = result.find((t) => t.id === 'task1');
      const task2 = result.find((t) => t.id === 'task2');
      const task3 = result.find((t) => t.id === 'task3');

      expect(root?.kind).toBe('super');
      expect(root?.children).toEqual(['feature1', 'feature2']);

      expect(feature1?.kind).toBe('feature');
      expect(feature1?.children).toEqual(['task1', 'task2']);

      expect(feature2?.kind).toBe('feature');
      expect(feature2?.children).toEqual(['task3']);

      expect(task1?.kind).toBe('task');
      expect(task1?.children).toEqual([]);

      expect(task2?.kind).toBe('task');
      expect(task2?.children).toEqual([]);

      expect(task3?.kind).toBe('task');
      expect(task3?.children).toEqual([]);
    });

    it('should include files from fileMap', () => {
      const tracks: Track[] = [
        {
          id: 'task1',
          title: 'Task',
          parent_id: 'root',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ];

      const fileMap = new Map<string, string[]>();
      fileMap.set('task1', ['src/file1.ts', 'src/file2.ts']);

      const result = buildTrackTree(tracks, fileMap);

      expect(result[0].files).toEqual(['src/file1.ts', 'src/file2.ts']);
    });

    it('should return empty files array when track has no files', () => {
      const tracks: Track[] = [
        {
          id: 'task1',
          title: 'Task',
          parent_id: 'root',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      ];

      const result = buildTrackTree(tracks, new Map());

      expect(result[0].files).toEqual([]);
    });

    it('should preserve all track fields in output', () => {
      const tracks: Track[] = [
        {
          id: 'track1',
          title: 'Test Track',
          parent_id: null,
          summary: 'Test summary',
          next_prompt: 'Test next',
          status: 'blocked',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-02T00:00:00.000Z',
        },
      ];

      const result = buildTrackTree(tracks, new Map());

      expect(result[0]).toMatchObject({
        id: 'track1',
        title: 'Test Track',
        parent_id: null,
        summary: 'Test summary',
        next_prompt: 'Test next',
        status: 'blocked',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-02T00:00:00.000Z',
      });
    });
  });
});
