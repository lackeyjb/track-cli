import Database from 'better-sqlite3';
import { initializeDatabase, getDatabase } from '../../storage/database.js';
import { getDatabasePath } from '../../utils/paths.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Helper to run a test with an isolated database.
 * Creates a temp directory, changes to it, initializes database, runs test, then cleans up.
 * Database functions will use the temp directory as the working directory.
 */
export async function withTestDatabase<T>(fn: () => T | Promise<T>): Promise<T> {
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'track-test-db-'));

  try {
    process.chdir(tempDir);
    initializeDatabase();
    return await fn();
  } finally {
    process.chdir(originalCwd);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get the database connection for the current test.
 * Use within withTestDatabase context.
 */
export function getTestDb(): Database.Database {
  return getDatabase();
}

/**
 * Get the database path for the current test.
 * Use within withTestDatabase context.
 */
export function getTestDbPath(): string {
  return getDatabasePath();
}
