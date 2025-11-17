import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Name of the track directory created at project root.
 */
export const TRACK_DIR = '.track';

/**
 * Name of the SQLite database file.
 */
export const DB_FILE = 'track.db';

/**
 * Get the path to the .track directory in the current working directory.
 *
 * @returns Absolute path to .track directory
 */
export function getTrackDir(): string {
  return join(process.cwd(), TRACK_DIR);
}

/**
 * Get the path to the SQLite database file.
 *
 * @returns Absolute path to track.db file
 */
export function getDatabasePath(): string {
  return join(getTrackDir(), DB_FILE);
}

/**
 * Check if a track project exists in the current directory.
 *
 * @returns true if .track directory exists
 */
export function projectExists(): boolean {
  return existsSync(getTrackDir());
}
