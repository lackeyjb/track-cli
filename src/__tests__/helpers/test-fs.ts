import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Create a temporary directory for testing track projects.
 * Returns the path to the temp directory.
 */
export function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'track-test-project-'));
}

/**
 * Clean up a temporary directory and all its contents.
 */
export function cleanupTempDir(dirPath: string): void {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Helper to run a test with a temporary working directory.
 * Automatically creates, switches to, and cleans up the directory.
 * Restores original working directory after test.
 */
export async function withTempDir<T>(fn: (dirPath: string) => T | Promise<T>): Promise<T> {
  const originalCwd = process.cwd();
  const tempDir = createTempDir();

  try {
    process.chdir(tempDir);
    return await fn(tempDir);
  } finally {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  }
}

/**
 * Create a .track directory structure in the given directory.
 */
export function createTrackDir(projectDir: string): string {
  const trackDir = path.join(projectDir, '.track');
  fs.mkdirSync(trackDir, { recursive: true });
  return trackDir;
}
