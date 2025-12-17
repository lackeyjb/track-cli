import { describe, it, expect } from 'vitest';
import * as lib from '../db.js';
import { withTestDatabase, getTestDbPath } from '../../__tests__/helpers/test-db.js';

describe('dependency database functions', () => {
  describe('addDependency and getBlockersOf/getBlockedBy', () => {
    it('should add a blocking dependency', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        // Create two tracks
        const track1 = lib.createTrack(dbPath, {
          id: 'TRACK1',
          title: 'Track 1',
          parent_id: null,
          summary: 'Summary 1',
          next_prompt: 'Next 1',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        const track2 = lib.createTrack(dbPath, {
          id: 'TRACK2',
          title: 'Track 2',
          parent_id: 'TRACK1',
          summary: 'Summary 2',
          next_prompt: 'Next 2',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // Add dependency: TRACK1 blocks TRACK2
        lib.addDependency(dbPath, track1.id, track2.id);

        // Verify using getBlockersOf
        const blockers = lib.getBlockersOf(dbPath, 'TRACK2');
        expect(blockers).toContain('TRACK1');
        expect(blockers).toHaveLength(1);

        // Verify using getBlockedBy
        const blocked = lib.getBlockedBy(dbPath, 'TRACK1');
        expect(blocked).toContain('TRACK2');
        expect(blocked).toHaveLength(1);
      });
    });

    it('should allow multiple blockers for a single track', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        // Create root and three child tracks
        lib.createTrack(dbPath, {
          id: 'ROOT',
          title: 'Root',
          parent_id: null,
          summary: 'Root',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKER1',
          title: 'Blocker 1',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKER2',
          title: 'Blocker 2',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKED',
          title: 'Blocked',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'blocked',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // Add two blockers
        lib.addDependency(dbPath, 'BLOCKER1', 'BLOCKED');
        lib.addDependency(dbPath, 'BLOCKER2', 'BLOCKED');

        const blockers = lib.getBlockersOf(dbPath, 'BLOCKED');
        expect(blockers).toHaveLength(2);
        expect(blockers).toContain('BLOCKER1');
        expect(blockers).toContain('BLOCKER2');
      });
    });

    it('should be idempotent (adding same dependency twice)', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // Add same dependency twice
        lib.addDependency(dbPath, 'A', 'B');
        lib.addDependency(dbPath, 'A', 'B');

        const blockers = lib.getBlockersOf(dbPath, 'B');
        expect(blockers).toHaveLength(1);
      });
    });
  });

  describe('removeDependency', () => {
    it('should remove a blocking dependency', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'blocked',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.addDependency(dbPath, 'A', 'B');
        expect(lib.getBlockersOf(dbPath, 'B')).toHaveLength(1);

        lib.removeDependency(dbPath, 'A', 'B');
        expect(lib.getBlockersOf(dbPath, 'B')).toHaveLength(0);
      });
    });

    it('should not error when removing non-existent dependency', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // Should not throw
        expect(() => lib.removeDependency(dbPath, 'A', 'B')).not.toThrow();
      });
    });
  });

  describe('wouldCreateCycle', () => {
    it('should detect simple direct cycle', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // A blocks B
        lib.addDependency(dbPath, 'A', 'B');

        // B blocking A would create a cycle
        expect(lib.wouldCreateCycle(dbPath, 'B', 'A')).toBe(true);
      });
    });

    it('should detect indirect cycle', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        // Create A -> B -> C chain
        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'C',
          title: 'C',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // A blocks B, B blocks C
        lib.addDependency(dbPath, 'A', 'B');
        lib.addDependency(dbPath, 'B', 'C');

        // C blocking A would create an indirect cycle: A -> B -> C -> A
        expect(lib.wouldCreateCycle(dbPath, 'C', 'A')).toBe(true);
      });
    });

    it('should allow non-cyclic dependencies', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'C',
          title: 'C',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // A blocks B
        lib.addDependency(dbPath, 'A', 'B');

        // A blocking C would not create a cycle
        expect(lib.wouldCreateCycle(dbPath, 'A', 'C')).toBe(false);
      });
    });
  });

  describe('areAllBlockersDone', () => {
    it('should return true when no blockers', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        expect(lib.areAllBlockersDone(dbPath, 'A')).toBe(true);
      });
    });

    it('should return true when all blockers are done', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'ROOT',
          title: 'Root',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'done',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKER1',
          title: 'Blocker 1',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'done',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKER2',
          title: 'Blocker 2',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'done',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKED',
          title: 'Blocked',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'blocked',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.addDependency(dbPath, 'BLOCKER1', 'BLOCKED');
        lib.addDependency(dbPath, 'BLOCKER2', 'BLOCKED');

        expect(lib.areAllBlockersDone(dbPath, 'BLOCKED')).toBe(true);
      });
    });

    it('should return false when some blockers are not done', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'ROOT',
          title: 'Root',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'done',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKER1',
          title: 'Blocker 1',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'done',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKER2',
          title: 'Blocker 2',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'in_progress',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'BLOCKED',
          title: 'Blocked',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'blocked',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.addDependency(dbPath, 'BLOCKER1', 'BLOCKED');
        lib.addDependency(dbPath, 'BLOCKER2', 'BLOCKED');

        expect(lib.areAllBlockersDone(dbPath, 'BLOCKED')).toBe(false);
      });
    });
  });

  describe('hasBlockers', () => {
    it('should return false when no blockers', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        expect(lib.hasBlockers(dbPath, 'A')).toBe(false);
      });
    });

    it('should return true when has blockers', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'blocked',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.addDependency(dbPath, 'A', 'B');

        expect(lib.hasBlockers(dbPath, 'B')).toBe(true);
      });
    });
  });

  describe('getAllDependencies', () => {
    it('should return empty map when no dependencies', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        const deps = lib.getAllDependencies(dbPath);
        expect(deps.size).toBe(0);
      });
    });

    it('should return all dependencies in correct format', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        lib.createTrack(dbPath, {
          id: 'ROOT',
          title: 'Root',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'blocked',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'C',
          title: 'C',
          parent_id: 'ROOT',
          summary: '',
          next_prompt: '',
          status: 'blocked',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // A blocks B and C
        lib.addDependency(dbPath, 'A', 'B');
        lib.addDependency(dbPath, 'A', 'C');

        const deps = lib.getAllDependencies(dbPath);

        // A should have blocks: [B, C] and blocked_by: []
        expect(deps.get('A')?.blocks).toHaveLength(2);
        expect(deps.get('A')?.blocks).toContain('B');
        expect(deps.get('A')?.blocks).toContain('C');
        expect(deps.get('A')?.blocked_by).toHaveLength(0);

        // B should have blocks: [] and blocked_by: [A]
        expect(deps.get('B')?.blocks).toHaveLength(0);
        expect(deps.get('B')?.blocked_by).toContain('A');

        // C should have blocks: [] and blocked_by: [A]
        expect(deps.get('C')?.blocks).toHaveLength(0);
        expect(deps.get('C')?.blocked_by).toContain('A');
      });
    });
  });

  describe('migration', () => {
    it('should migrate existing database to add dependencies table', async () => {
      await withTestDatabase(() => {
        const dbPath = getTestDbPath();

        // Migration should have been called during initialization
        // Verify we can use dependency functions
        lib.createTrack(dbPath, {
          id: 'A',
          title: 'A',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        lib.createTrack(dbPath, {
          id: 'B',
          title: 'B',
          parent_id: 'A',
          summary: '',
          next_prompt: '',
          status: 'planned',
          worktree: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        });

        // Should not throw
        lib.addDependency(dbPath, 'A', 'B');
        expect(lib.getBlockersOf(dbPath, 'B')).toContain('A');
      });
    });
  });
});
