import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type {
  CreateTrackParams,
  Track,
  UpdateTrackParams,
  TrackWithDetails,
  Status,
} from './types.js';

// Re-export types for convenience
export type { CreateTrackParams, Track, UpdateTrackParams, TrackWithDetails };

/**
 * Schema for the tracks table.
 */
const CREATE_TRACKS_TABLE = `
CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  parent_id TEXT,
  summary TEXT NOT NULL,
  next_prompt TEXT NOT NULL,
  status TEXT NOT NULL,
  worktree TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES tracks(id)
);
`;

/**
 * Schema for the track_files table.
 */
const CREATE_TRACK_FILES_TABLE = `
CREATE TABLE track_files (
  track_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  PRIMARY KEY (track_id, file_path),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);
`;

/**
 * Index on tracks.parent_id for efficient child lookups.
 */
const CREATE_PARENT_INDEX = `
CREATE INDEX idx_tracks_parent ON tracks(parent_id);
`;

/**
 * Index on tracks.status for efficient status filtering.
 */
const CREATE_STATUS_INDEX = `
CREATE INDEX idx_tracks_status ON tracks(status);
`;

/**
 * Index on track_files.track_id for efficient file lookups.
 */
const CREATE_FILES_INDEX = `
CREATE INDEX idx_track_files_track ON track_files(track_id);
`;

/**
 * Index on tracks.worktree for efficient worktree filtering.
 */
const CREATE_WORKTREE_INDEX = `
CREATE INDEX idx_tracks_worktree ON tracks(worktree);
`;

/**
 * Schema for the track_dependencies table.
 * Stores blocking relationships between tracks.
 */
const CREATE_DEPENDENCIES_TABLE = `
CREATE TABLE track_dependencies (
  blocking_track_id TEXT NOT NULL,
  blocked_track_id TEXT NOT NULL,
  PRIMARY KEY (blocking_track_id, blocked_track_id),
  FOREIGN KEY (blocking_track_id) REFERENCES tracks(id),
  FOREIGN KEY (blocked_track_id) REFERENCES tracks(id)
);
`;

/**
 * Index on blocking_track_id for efficient lookup of what a track blocks.
 */
const CREATE_DEPENDENCIES_BLOCKING_INDEX = `
CREATE INDEX idx_dependencies_blocking ON track_dependencies(blocking_track_id);
`;

/**
 * Index on blocked_track_id for efficient lookup of what blocks a track.
 */
const CREATE_DEPENDENCIES_BLOCKED_INDEX = `
CREATE INDEX idx_dependencies_blocked ON track_dependencies(blocked_track_id);
`;

/**
 * Helper function to execute a database operation with proper connection handling.
 * Ensures foreign keys are enabled and the connection is properly closed.
 */
function withDatabase<T>(dbPath: string, fn: (db: Database.Database) => T): T {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

/**
 * Initialize a new track database at the specified path.
 * Creates the parent directory, initializes SQLite database, and creates schema.
 *
 * @param dbPath - Absolute path to the database file
 * @throws Error if database creation fails
 */
export function initializeDatabase(dbPath: string): void {
  const trackDir = dirname(dbPath);

  // Create parent directory
  mkdirSync(trackDir, { recursive: true });

  // Create and configure database
  const db = new Database(dbPath);

  try {
    // Configure database for concurrency and data integrity
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    db.pragma('foreign_keys = ON'); // Enable foreign key constraints
    db.pragma('busy_timeout = 5000'); // Wait up to 5 seconds for locks

    // Create schema
    db.exec(CREATE_TRACKS_TABLE);
    db.exec(CREATE_TRACK_FILES_TABLE);
    db.exec(CREATE_DEPENDENCIES_TABLE);
    db.exec(CREATE_PARENT_INDEX);
    db.exec(CREATE_STATUS_INDEX);
    db.exec(CREATE_FILES_INDEX);
    db.exec(CREATE_WORKTREE_INDEX);
    db.exec(CREATE_DEPENDENCIES_BLOCKING_INDEX);
    db.exec(CREATE_DEPENDENCIES_BLOCKED_INDEX);
  } finally {
    db.close();
  }
}

/**
 * Migrate an existing database to add the worktree column if it doesn't exist,
 * and add the track_dependencies table if it doesn't exist.
 * This is safe to call on databases that already have these structures.
 *
 * @param dbPath - Path to the database file
 */
export function migrateDatabase(dbPath: string): void {
  const db = new Database(dbPath);
  try {
    // Migrate worktree column
    const columns = db.pragma('table_info(tracks)') as Array<{ name: string }>;
    const hasWorktree = columns.some((col) => col.name === 'worktree');
    if (!hasWorktree) {
      db.exec('ALTER TABLE tracks ADD COLUMN worktree TEXT DEFAULT NULL');
      // Check if the index exists before creating
      const indices = db.pragma('index_list(tracks)') as Array<{ name: string }>;
      const hasWorktreeIndex = indices.some((idx) => idx.name === 'idx_tracks_worktree');
      if (!hasWorktreeIndex) {
        db.exec(CREATE_WORKTREE_INDEX);
      }
    }

    // Migrate track_dependencies table
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{
      name: string;
    }>;
    const hasDependencies = tables.some((t) => t.name === 'track_dependencies');
    if (!hasDependencies) {
      db.exec(CREATE_DEPENDENCIES_TABLE);
      db.exec(CREATE_DEPENDENCIES_BLOCKING_INDEX);
      db.exec(CREATE_DEPENDENCIES_BLOCKED_INDEX);
    }
  } finally {
    db.close();
  }
}

/**
 * Create a new track in the database.
 *
 * @param dbPath - Path to the database file
 * @param params - Track creation parameters
 * @returns The created track
 */
export function createTrack(dbPath: string, params: CreateTrackParams): Track {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare(`
      INSERT INTO tracks (
        id, title, parent_id, summary, next_prompt, status, worktree, created_at, updated_at
      ) VALUES (
        @id, @title, @parent_id, @summary, @next_prompt, @status, @worktree, @created_at, @updated_at
      )
    `);

    stmt.run(params);

    return params;
  });
}

/**
 * Check if a track exists by ID.
 *
 * @param dbPath - Path to the database file
 * @param trackId - Track ID to check
 * @returns true if track exists, false otherwise
 */
export function trackExists(dbPath: string, trackId: string): boolean {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare('SELECT 1 FROM tracks WHERE id = ? LIMIT 1');
    const result = stmt.get(trackId);
    return result !== undefined;
  });
}

/**
 * Get a track by ID.
 *
 * @param dbPath - Path to the database file
 * @param trackId - Track ID to retrieve
 * @returns Track if found, undefined otherwise
 */
export function getTrack(dbPath: string, trackId: string): Track | undefined {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare('SELECT * FROM tracks WHERE id = ?');
    return stmt.get(trackId) as Track | undefined;
  });
}

/**
 * Update an existing track's mutable fields.
 *
 * @param dbPath - Path to the database file
 * @param trackId - Track ID to update
 * @param params - Track update parameters
 */
export function updateTrack(dbPath: string, trackId: string, params: UpdateTrackParams): void {
  withDatabase(dbPath, (db) => {
    // Build dynamic SET clause based on provided fields
    const setClauses = [
      'summary = @summary',
      'next_prompt = @next_prompt',
      'status = @status',
      'updated_at = @updated_at',
    ];

    // Only include worktree in update if explicitly provided
    if ('worktree' in params) {
      setClauses.push('worktree = @worktree');
    }

    const stmt = db.prepare(`
      UPDATE tracks
      SET ${setClauses.join(', ')}
      WHERE id = @id
    `);

    stmt.run({
      id: trackId,
      ...params,
    });
  });
}

/**
 * Get the root track (project track).
 * The root track has parent_id = NULL.
 *
 * @param dbPath - Path to the database file
 * @returns Root track if found, undefined otherwise
 */
export function getRootTrack(dbPath: string): Track | undefined {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare('SELECT * FROM tracks WHERE parent_id IS NULL LIMIT 1');
    return stmt.get() as Track | undefined;
  });
}

/**
 * Add file associations to a track.
 * Idempotent - duplicates are ignored via PRIMARY KEY constraint.
 *
 * @param dbPath - Path to the database file
 * @param trackId - Track ID to associate files with
 * @param filePaths - Array of file paths to associate
 */
export function addTrackFiles(dbPath: string, trackId: string, filePaths: string[]): void {
  if (filePaths.length === 0) {
    return;
  }

  withDatabase(dbPath, (db) => {
    // Use a transaction for atomicity and performance
    const insertFile = db.prepare(`
      INSERT OR IGNORE INTO track_files (track_id, file_path)
      VALUES (?, ?)
    `);

    const insertMany = db.transaction((files: string[]) => {
      for (const filePath of files) {
        insertFile.run(trackId, filePath);
      }
    });

    insertMany(filePaths);
  });
}

/**
 * Get all tracks from the database.
 *
 * @param dbPath - Path to the database file
 * @returns Array of all tracks
 */
export function getAllTracks(dbPath: string): Track[] {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare('SELECT * FROM tracks');
    return stmt.all() as Track[];
  });
}

/**
 * Get tracks filtered by status values.
 * Uses the idx_tracks_status index for efficient filtering.
 *
 * @param dbPath - Path to the database file
 * @param statuses - Array of status values to filter by
 * @returns Array of tracks matching the given statuses
 */
export function getTracksByStatus(dbPath: string, statuses: readonly Status[]): Track[] {
  return withDatabase(dbPath, (db) => {
    const placeholders = statuses.map(() => '?').join(', ');
    const stmt = db.prepare(`SELECT * FROM tracks WHERE status IN (${placeholders})`);
    return stmt.all(...statuses) as Track[];
  });
}

/**
 * Get all track-file associations from the database.
 *
 * @param dbPath - Path to the database file
 * @returns Map of track IDs to arrays of file paths
 */
export function getAllTrackFiles(dbPath: string): Map<string, string[]> {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare('SELECT track_id, file_path FROM track_files');
    const rows = stmt.all() as Array<{ track_id: string; file_path: string }>;

    // Group file paths by track_id
    const fileMap = new Map<string, string[]>();
    for (const row of rows) {
      const existing = fileMap.get(row.track_id) || [];
      existing.push(row.file_path);
      fileMap.set(row.track_id, existing);
    }

    return fileMap;
  });
}

/**
 * Get tracks filtered by worktree name.
 * Uses the idx_tracks_worktree index for efficient filtering.
 *
 * @param dbPath - Path to the database file
 * @param worktree - Worktree name to filter by
 * @returns Array of tracks matching the given worktree
 */
export function getTracksByWorktree(dbPath: string, worktree: string): Track[] {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare('SELECT * FROM tracks WHERE worktree = ?');
    return stmt.all(worktree) as Track[];
  });
}

/**
 * Get tracks filtered by both status values and worktree.
 * Combines idx_tracks_status and idx_tracks_worktree for efficient filtering.
 *
 * @param dbPath - Path to the database file
 * @param statuses - Array of status values to filter by
 * @param worktree - Worktree name to filter by
 * @returns Array of tracks matching the given statuses and worktree
 */
export function getTracksByStatusAndWorktree(
  dbPath: string,
  statuses: readonly Status[],
  worktree: string
): Track[] {
  return withDatabase(dbPath, (db) => {
    const placeholders = statuses.map(() => '?').join(', ');
    const stmt = db.prepare(
      `SELECT * FROM tracks WHERE status IN (${placeholders}) AND worktree = ?`
    );
    return stmt.all(...statuses, worktree) as Track[];
  });
}

// ============================================================================
// Dependency Management Functions
// ============================================================================

/**
 * Check if adding a dependency would create a cycle.
 * Uses DFS from blockedId to see if it can reach blockingId.
 *
 * @param dbPath - Path to the database file
 * @param blockingId - The track that would block
 * @param blockedId - The track that would be blocked
 * @returns true if adding this dependency would create a cycle
 */
export function wouldCreateCycle(dbPath: string, blockingId: string, blockedId: string): boolean {
  return withDatabase(dbPath, (db) => {
    // If adding blockingId -> blockedId, check if blockedId can reach blockingId
    // DFS: starting from blockedId, follow "blocks" edges (what does blockedId block?)
    const visited = new Set<string>();
    const stack = [blockedId];

    const getBlockedByStmt = db.prepare(
      'SELECT blocked_track_id FROM track_dependencies WHERE blocking_track_id = ?'
    );

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === blockingId) return true; // Cycle found
      if (visited.has(current)) continue;
      visited.add(current);

      // Get all tracks that 'current' blocks
      const blocked = getBlockedByStmt.all(current) as Array<{ blocked_track_id: string }>;
      for (const row of blocked) {
        stack.push(row.blocked_track_id);
      }
    }
    return false;
  });
}

/**
 * Add a blocking dependency between two tracks.
 *
 * @param dbPath - Path to the database file
 * @param blockingId - The track that blocks
 * @param blockedId - The track that is blocked
 * @throws Error if adding would create a cycle or tracks don't exist
 */
export function addDependency(dbPath: string, blockingId: string, blockedId: string): void {
  withDatabase(dbPath, (db) => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO track_dependencies (blocking_track_id, blocked_track_id)
      VALUES (?, ?)
    `);
    stmt.run(blockingId, blockedId);
  });
}

/**
 * Remove a blocking dependency between two tracks.
 *
 * @param dbPath - Path to the database file
 * @param blockingId - The track that blocks
 * @param blockedId - The track that is blocked
 */
export function removeDependency(dbPath: string, blockingId: string, blockedId: string): void {
  withDatabase(dbPath, (db) => {
    const stmt = db.prepare(`
      DELETE FROM track_dependencies
      WHERE blocking_track_id = ? AND blocked_track_id = ?
    `);
    stmt.run(blockingId, blockedId);
  });
}

/**
 * Get all tracks that block a given track.
 *
 * @param dbPath - Path to the database file
 * @param trackId - The track to check
 * @returns Array of track IDs that block the given track
 */
export function getBlockersOf(dbPath: string, trackId: string): string[] {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare(
      'SELECT blocking_track_id FROM track_dependencies WHERE blocked_track_id = ?'
    );
    const rows = stmt.all(trackId) as Array<{ blocking_track_id: string }>;
    return rows.map((row) => row.blocking_track_id);
  });
}

/**
 * Get all tracks that a given track blocks.
 *
 * @param dbPath - Path to the database file
 * @param trackId - The track to check
 * @returns Array of track IDs that are blocked by the given track
 */
export function getBlockedBy(dbPath: string, trackId: string): string[] {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare(
      'SELECT blocked_track_id FROM track_dependencies WHERE blocking_track_id = ?'
    );
    const rows = stmt.all(trackId) as Array<{ blocked_track_id: string }>;
    return rows.map((row) => row.blocked_track_id);
  });
}

/**
 * Check if all blockers of a track are done.
 *
 * @param dbPath - Path to the database file
 * @param trackId - The track to check
 * @returns true if all blocking tracks have status 'done', false otherwise
 */
export function areAllBlockersDone(dbPath: string, trackId: string): boolean {
  return withDatabase(dbPath, (db) => {
    // Get all blocking tracks and check if they're all done
    const stmt = db.prepare(`
      SELECT t.status
      FROM track_dependencies d
      JOIN tracks t ON d.blocking_track_id = t.id
      WHERE d.blocked_track_id = ?
    `);
    const rows = stmt.all(trackId) as Array<{ status: string }>;

    // If no blockers, return true
    if (rows.length === 0) return true;

    // Check if all are done
    return rows.every((row) => row.status === 'done');
  });
}

/**
 * Check if a track has any dependency records (blockers).
 *
 * @param dbPath - Path to the database file
 * @param trackId - The track to check
 * @returns true if the track has at least one blocker
 */
export function hasBlockers(dbPath: string, trackId: string): boolean {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare('SELECT 1 FROM track_dependencies WHERE blocked_track_id = ? LIMIT 1');
    const result = stmt.get(trackId);
    return result !== undefined;
  });
}

/**
 * Get all dependencies as a map for efficient lookup.
 *
 * @param dbPath - Path to the database file
 * @returns Map of track IDs to their blocks and blocked_by arrays
 */
export function getAllDependencies(
  dbPath: string
): Map<string, { blocks: string[]; blocked_by: string[] }> {
  return withDatabase(dbPath, (db) => {
    const stmt = db.prepare('SELECT blocking_track_id, blocked_track_id FROM track_dependencies');
    const rows = stmt.all() as Array<{ blocking_track_id: string; blocked_track_id: string }>;

    const dependencyMap = new Map<string, { blocks: string[]; blocked_by: string[] }>();

    // Helper to ensure entry exists
    const ensureEntry = (id: string) => {
      if (!dependencyMap.has(id)) {
        dependencyMap.set(id, { blocks: [], blocked_by: [] });
      }
      return dependencyMap.get(id)!;
    };

    for (const row of rows) {
      // The blocking track blocks the blocked track
      const blockingEntry = ensureEntry(row.blocking_track_id);
      blockingEntry.blocks.push(row.blocked_track_id);

      // The blocked track is blocked by the blocking track
      const blockedEntry = ensureEntry(row.blocked_track_id);
      blockedEntry.blocked_by.push(row.blocking_track_id);
    }

    return dependencyMap;
  });
}
