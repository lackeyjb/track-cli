import { describe, it, expect } from 'vitest';
import {
  createTrack,
  getTrack,
  trackExists,
  updateTrack,
  getRootTrack,
  addTrackFiles,
  getAllTracks,
  getAllTrackFiles,
  getDatabase,
} from '../database.js';
import { withTestDatabase } from '../../__tests__/helpers/test-db.js';
import type { CreateTrackParams, UpdateTrackParams } from '../../models/types.js';
import fs from 'fs';

describe('database storage', () => {
  describe('initializeDatabase', () => {
    it('should create .track directory', async () => {
      await withTestDatabase(() => {
        expect(fs.existsSync('.track')).toBe(true);
      });
    });

    it('should create track.db file', async () => {
      await withTestDatabase(() => {
        expect(fs.existsSync('.track/track.db')).toBe(true);
      });
    });

    it('should create tracks table with correct schema', async () => {
      await withTestDatabase(() => {
        const db = getDatabase();
        try {
          const result = db
            .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tracks'")
            .get() as { sql: string } | undefined;

          expect(result).toBeDefined();
          expect(result?.sql).toContain('id TEXT PRIMARY KEY');
          expect(result?.sql).toContain('title TEXT NOT NULL');
          expect(result?.sql).toContain('parent_id TEXT');
          expect(result?.sql).toContain('summary TEXT NOT NULL');
          expect(result?.sql).toContain('next_prompt TEXT NOT NULL');
          expect(result?.sql).toContain('status TEXT NOT NULL');
          expect(result?.sql).toContain('created_at TEXT NOT NULL');
          expect(result?.sql).toContain('updated_at TEXT NOT NULL');
          expect(result?.sql).toContain('FOREIGN KEY (parent_id) REFERENCES tracks(id)');
        } finally {
          db.close();
        }
      });
    });

    it('should create track_files table with correct schema', async () => {
      await withTestDatabase(() => {
        const db = getDatabase();
        try {
          const result = db
            .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='track_files'")
            .get() as { sql: string } | undefined;

          expect(result).toBeDefined();
          expect(result?.sql).toContain('track_id TEXT NOT NULL');
          expect(result?.sql).toContain('file_path TEXT NOT NULL');
          expect(result?.sql).toContain('PRIMARY KEY (track_id, file_path)');
          expect(result?.sql).toContain('FOREIGN KEY (track_id) REFERENCES tracks(id)');
        } finally {
          db.close();
        }
      });
    });

    it('should create required indexes', async () => {
      await withTestDatabase(() => {
        const db = getDatabase();
        try {
          const indexes = db
            .prepare("SELECT name FROM sqlite_master WHERE type='index'")
            .all() as Array<{ name: string }>;

          const indexNames = indexes.map((idx) => idx.name);

          expect(indexNames).toContain('idx_tracks_parent');
          expect(indexNames).toContain('idx_tracks_status');
          expect(indexNames).toContain('idx_track_files_track');
        } finally {
          db.close();
        }
      });
    });

    it('should enable WAL mode', async () => {
      await withTestDatabase(() => {
        const db = getDatabase();
        try {
          const result = db.pragma('journal_mode', { simple: true });
          expect(result).toBe('wal');
        } finally {
          db.close();
        }
      });
    });

    it('should enable foreign keys', async () => {
      await withTestDatabase(() => {
        const db = getDatabase();
        try {
          const result = db.pragma('foreign_keys', { simple: true });
          expect(result).toBe(1);
        } finally {
          db.close();
        }
      });
    });
  });

  describe('createTrack', () => {
    it('should insert track into database', async () => {
      await withTestDatabase(() => {
        const params: CreateTrackParams = {
          id: 'test123',
          title: 'Test Track',
          parent_id: null,
          summary: 'Test summary',
          next_prompt: 'Test next',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        };

        const result = createTrack(params);

        expect(result).toEqual(params);

        // Verify it was inserted
        const db = getDatabase();
        try {
          const row = db.prepare('SELECT * FROM tracks WHERE id = ?').get('test123');
          expect(row).toBeDefined();
        } finally {
          db.close();
        }
      });
    });

    it('should create track with parent_id', async () => {
      await withTestDatabase(() => {
        // Create parent first
        createTrack({
          id: 'parent1',
          title: 'Parent',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        // Create child
        const child: CreateTrackParams = {
          id: 'child1',
          title: 'Child',
          parent_id: 'parent1',
          summary: 'Child summary',
          next_prompt: 'Child next',
          status: 'in_progress',
          created_at: '2025-01-01T00:01:00.000Z',
          updated_at: '2025-01-01T00:01:00.000Z',
        };

        const result = createTrack(child);

        expect(result.parent_id).toBe('parent1');
      });
    });
  });

  describe('trackExists', () => {
    it('should return true when track exists', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'exists1',
          title: 'Exists',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        expect(trackExists('exists1')).toBe(true);
      });
    });

    it('should return false when track does not exist', async () => {
      await withTestDatabase(() => {
        expect(trackExists('nonexistent')).toBe(false);
      });
    });
  });

  describe('getTrack', () => {
    it('should return track when it exists', async () => {
      await withTestDatabase(() => {
        const params: CreateTrackParams = {
          id: 'get1',
          title: 'Get Test',
          parent_id: null,
          summary: 'Summary',
          next_prompt: 'Next',
          status: 'in_progress',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:01:00.000Z',
        };

        createTrack(params);

        const track = getTrack('get1');

        expect(track).toEqual(params);
      });
    });

    it('should return undefined when track does not exist', async () => {
      await withTestDatabase(() => {
        const track = getTrack('nonexistent');
        expect(track).toBeUndefined();
      });
    });
  });

  describe('updateTrack', () => {
    it('should update track fields', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'update1',
          title: 'Update Test',
          parent_id: null,
          summary: 'Original summary',
          next_prompt: 'Original next',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        const updateParams: UpdateTrackParams = {
          summary: 'Updated summary',
          next_prompt: 'Updated next',
          status: 'in_progress',
          updated_at: '2025-01-01T00:05:00.000Z',
        };

        updateTrack('update1', updateParams);

        const track = getTrack('update1');

        expect(track?.summary).toBe('Updated summary');
        expect(track?.next_prompt).toBe('Updated next');
        expect(track?.status).toBe('in_progress');
        expect(track?.updated_at).toBe('2025-01-01T00:05:00.000Z');
      });
    });

    it('should not update immutable fields', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'update2',
          title: 'Original Title',
          parent_id: null,
          summary: 'Summary',
          next_prompt: 'Next',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        updateTrack('update2', {
          summary: 'New summary',
          next_prompt: 'New next',
          status: 'done',
          updated_at: '2025-01-01T00:10:00.000Z',
        });

        const track = getTrack('update2');

        // Immutable fields should not change
        expect(track?.title).toBe('Original Title');
        expect(track?.id).toBe('update2');
        expect(track?.parent_id).toBeNull();
        expect(track?.created_at).toBe('2025-01-01T00:00:00.000Z');
      });
    });
  });

  describe('getRootTrack', () => {
    it('should return track with parent_id = null', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'root1',
          title: 'Root Track',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        const root = getRootTrack();

        expect(root).toBeDefined();
        expect(root?.id).toBe('root1');
        expect(root?.parent_id).toBeNull();
      });
    });

    it('should return undefined when no root track exists', async () => {
      await withTestDatabase(() => {
        const root = getRootTrack();
        expect(root).toBeUndefined();
      });
    });

    it('should not return tracks with parent_id set', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'root1',
          title: 'Root',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        createTrack({
          id: 'child1',
          title: 'Child',
          parent_id: 'root1',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:01:00.000Z',
          updated_at: '2025-01-01T00:01:00.000Z',
        });

        const root = getRootTrack();

        expect(root?.id).toBe('root1');
        expect(root?.id).not.toBe('child1');
      });
    });
  });

  describe('addTrackFiles', () => {
    it('should add files to track', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'track1',
          title: 'Track',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        addTrackFiles('track1', ['file1.ts', 'file2.ts']);

        const db = getDatabase();
        try {
          const files = db
            .prepare('SELECT file_path FROM track_files WHERE track_id = ?')
            .all('track1') as Array<{ file_path: string }>;

          expect(files).toHaveLength(2);
          expect(files.map((f) => f.file_path)).toContain('file1.ts');
          expect(files.map((f) => f.file_path)).toContain('file2.ts');
        } finally {
          db.close();
        }
      });
    });

    it('should be idempotent (ignore duplicates)', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'track1',
          title: 'Track',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        addTrackFiles('track1', ['file1.ts']);
        addTrackFiles('track1', ['file1.ts']); // Duplicate

        const db = getDatabase();
        try {
          const files = db
            .prepare('SELECT file_path FROM track_files WHERE track_id = ?')
            .all('track1') as Array<{ file_path: string }>;

          expect(files).toHaveLength(1);
        } finally {
          db.close();
        }
      });
    });

    it('should handle empty file array', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'track1',
          title: 'Track',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        // Should not throw
        addTrackFiles('track1', []);

        const db = getDatabase();
        try {
          const files = db
            .prepare('SELECT file_path FROM track_files WHERE track_id = ?')
            .all('track1');

          expect(files).toHaveLength(0);
        } finally {
          db.close();
        }
      });
    });

    it('should add multiple files in one call', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'track1',
          title: 'Track',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        addTrackFiles('track1', ['file1.ts', 'file2.ts', 'file3.ts']);

        const db = getDatabase();
        try {
          const files = db
            .prepare('SELECT file_path FROM track_files WHERE track_id = ?')
            .all('track1');

          expect(files).toHaveLength(3);
        } finally {
          db.close();
        }
      });
    });
  });

  describe('getAllTracks', () => {
    it('should return all tracks', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'track1',
          title: 'Track 1',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        createTrack({
          id: 'track2',
          title: 'Track 2',
          parent_id: 'track1',
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:01:00.000Z',
          updated_at: '2025-01-01T00:01:00.000Z',
        });

        const tracks = getAllTracks();

        expect(tracks).toHaveLength(2);
        expect(tracks.map((t) => t.id)).toContain('track1');
        expect(tracks.map((t) => t.id)).toContain('track2');
      });
    });

    it('should return empty array when no tracks exist', async () => {
      await withTestDatabase(() => {
        const tracks = getAllTracks();
        expect(tracks).toEqual([]);
      });
    });
  });

  describe('getAllTrackFiles', () => {
    it('should return map of track IDs to file paths', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'track1',
          title: 'Track 1',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        createTrack({
          id: 'track2',
          title: 'Track 2',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:01:00.000Z',
          updated_at: '2025-01-01T00:01:00.000Z',
        });

        addTrackFiles('track1', ['file1.ts', 'file2.ts']);
        addTrackFiles('track2', ['file3.ts']);

        const fileMap = getAllTrackFiles();

        expect(fileMap.get('track1')).toEqual(['file1.ts', 'file2.ts']);
        expect(fileMap.get('track2')).toEqual(['file3.ts']);
      });
    });

    it('should return empty map when no files exist', async () => {
      await withTestDatabase(() => {
        const fileMap = getAllTrackFiles();
        expect(fileMap.size).toBe(0);
      });
    });

    it('should not include tracks with no files', async () => {
      await withTestDatabase(() => {
        createTrack({
          id: 'track1',
          title: 'Track 1',
          parent_id: null,
          summary: '',
          next_prompt: '',
          status: 'planned',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });

        const fileMap = getAllTrackFiles();

        expect(fileMap.has('track1')).toBe(false);
      });
    });
  });
});
