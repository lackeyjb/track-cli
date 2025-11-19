import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { CreateTrackParams, Track, UpdateTrackParams, TrackWithDetails } from './types.js';

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
    db.exec(CREATE_PARENT_INDEX);
    db.exec(CREATE_STATUS_INDEX);
    db.exec(CREATE_FILES_INDEX);
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
        id, title, parent_id, summary, next_prompt, status, created_at, updated_at
      ) VALUES (
        @id, @title, @parent_id, @summary, @next_prompt, @status, @created_at, @updated_at
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
    const stmt = db.prepare(`
      UPDATE tracks
      SET summary = @summary,
          next_prompt = @next_prompt,
          status = @status,
          updated_at = @updated_at
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
