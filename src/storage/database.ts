import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { getDatabasePath, getTrackDir } from '../utils/paths.js';
import type { CreateTrackParams, Track } from '../models/types.js';

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
 * Get a database connection to the track database.
 * Opens the database at .track/track.db in the current directory.
 *
 * @returns SQLite database instance
 * @throws Error if database doesn't exist or can't be opened
 */
export function getDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  const db = new Database(dbPath);

  // Enable foreign keys (must be done per connection)
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * Initialize the track database.
 * Creates the .track directory, initializes SQLite database, and creates schema.
 *
 * This should only be called by the init command.
 *
 * @throws Error if .track directory already exists or database creation fails
 */
export function initializeDatabase(): void {
  const trackDir = getTrackDir();
  const dbPath = getDatabasePath();

  // Create .track directory
  mkdirSync(trackDir, { recursive: false });

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
 * @param params - Track creation parameters
 * @returns The created track
 */
export function createTrack(params: CreateTrackParams): Track {
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      INSERT INTO tracks (
        id, title, parent_id, summary, next_prompt, status, created_at, updated_at
      ) VALUES (
        @id, @title, @parent_id, @summary, @next_prompt, @status, @created_at, @updated_at
      )
    `);

    stmt.run(params);

    return params;
  } finally {
    db.close();
  }
}

/**
 * Check if a track exists by ID.
 *
 * @param trackId - Track ID to check
 * @returns true if track exists, false otherwise
 */
export function trackExists(trackId: string): boolean {
  const db = getDatabase();

  try {
    const stmt = db.prepare('SELECT 1 FROM tracks WHERE id = ? LIMIT 1');
    const result = stmt.get(trackId);
    return result !== undefined;
  } finally {
    db.close();
  }
}

/**
 * Get a track by ID.
 *
 * @param trackId - Track ID to retrieve
 * @returns Track if found, undefined otherwise
 */
export function getTrack(trackId: string): Track | undefined {
  const db = getDatabase();

  try {
    const stmt = db.prepare('SELECT * FROM tracks WHERE id = ?');
    return stmt.get(trackId) as Track | undefined;
  } finally {
    db.close();
  }
}
