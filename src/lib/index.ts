/**
 * track-cli Library API
 *
 * This module provides a programmatic interface to track-cli functionality.
 * Use TrackManager to interact with track databases from your application.
 */

import { existsSync } from 'fs';
import { dirname } from 'path';
import { buildTrackTree } from '../models/tree.js';
import { generateId } from '../utils/id.js';
import { getCurrentTimestamp } from '../utils/timestamp.js';
import * as db from './db.js';

export * from './types.js';

/**
 * TrackManager provides a high-level API for interacting with track databases.
 * Each instance is bound to a specific database path.
 *
 * @example
 * ```typescript
 * import { TrackManager } from 'track-cli/lib';
 *
 * const manager = new TrackManager('/path/to/project/.track/track.db');
 *
 * // Initialize a new database
 * manager.initialize();
 *
 * // Create the project root track
 * const project = manager.createTrack({
 *   title: 'My Project',
 *   summary: 'Project initialized',
 *   next_prompt: 'Start implementing features'
 * });
 *
 * // Get current status
 * const status = manager.getStatus();
 * console.log(status.tracks);
 * ```
 */
export class TrackManager {
  /**
   * Create a new TrackManager instance.
   *
   * @param dbPath - Absolute path to the track database file
   */
  constructor(private readonly dbPath: string) {}

  /**
   * Check if the track database exists.
   *
   * @returns true if the database file exists
   */
  exists(): boolean {
    return existsSync(this.dbPath);
  }

  /**
   * Check if the parent directory of the database exists.
   *
   * @returns true if the .track directory exists
   */
  dirExists(): boolean {
    return existsSync(dirname(this.dbPath));
  }

  /**
   * Initialize a new track database.
   * Creates the .track directory and database with schema.
   *
   * @throws Error if database creation fails
   */
  initialize(): void {
    db.initializeDatabase(this.dbPath);
  }

  /**
   * Create a new track.
   * Automatically generates ID and timestamps.
   *
   * @param params - Track creation parameters (without id and timestamps)
   * @returns The created track
   */
  createTrack(params: {
    title: string;
    parent_id?: string | null;
    summary: string;
    next_prompt: string;
    status?: 'planned' | 'in_progress' | 'done' | 'blocked' | 'superseded';
    worktree?: string | null;
    files?: string[];
  }): db.Track {
    const now = getCurrentTimestamp();
    const trackParams: db.CreateTrackParams = {
      id: generateId(),
      title: params.title,
      parent_id: params.parent_id ?? null,
      summary: params.summary,
      next_prompt: params.next_prompt,
      status: params.status ?? 'planned',
      worktree: params.worktree ?? null,
      created_at: now,
      updated_at: now,
    };

    const track = db.createTrack(this.dbPath, trackParams);

    // Add file associations if provided
    if (params.files && params.files.length > 0) {
      db.addTrackFiles(this.dbPath, track.id, params.files);
    }

    return track;
  }

  /**
   * Update an existing track.
   * Automatically updates the updated_at timestamp.
   *
   * @param trackId - ID of the track to update
   * @param params - Fields to update
   */
  updateTrack(
    trackId: string,
    params: {
      summary: string;
      next_prompt: string;
      status: 'planned' | 'in_progress' | 'done' | 'blocked' | 'superseded';
      worktree?: string | null;
      files?: string[];
    }
  ): void {
    const updateParams: db.UpdateTrackParams = {
      summary: params.summary,
      next_prompt: params.next_prompt,
      status: params.status,
      updated_at: getCurrentTimestamp(),
    };

    // Only include worktree if explicitly provided
    if ('worktree' in params) {
      updateParams.worktree = params.worktree;
    }

    db.updateTrack(this.dbPath, trackId, updateParams);

    // Add file associations if provided
    if (params.files && params.files.length > 0) {
      db.addTrackFiles(this.dbPath, trackId, params.files);
    }
  }

  /**
   * Check if a track exists by ID.
   *
   * @param trackId - Track ID to check
   * @returns true if track exists
   */
  trackExists(trackId: string): boolean {
    return db.trackExists(this.dbPath, trackId);
  }

  /**
   * Get a track by ID.
   *
   * @param trackId - Track ID to retrieve
   * @returns Track if found, undefined otherwise
   */
  getTrack(trackId: string): db.Track | undefined {
    return db.getTrack(this.dbPath, trackId);
  }

  /**
   * Get the root track (project).
   *
   * @returns Root track if found, undefined otherwise
   */
  getRootTrack(): db.Track | undefined {
    return db.getRootTrack(this.dbPath);
  }

  /**
   * Get the complete status of the project.
   * Returns all tracks with derived fields (kind, files, children, blocks, blocked_by).
   *
   * @returns Project status with track tree
   */
  getStatus(): { tracks: db.TrackWithDetails[] } {
    const tracks = db.getAllTracks(this.dbPath);
    const fileMap = db.getAllTrackFiles(this.dbPath);
    const dependencyMap = db.getAllDependencies(this.dbPath);
    const tracksWithDetails = buildTrackTree(tracks, fileMap, dependencyMap);

    return { tracks: tracksWithDetails };
  }

  /**
   * Get all raw tracks from the database.
   *
   * @returns Array of all tracks
   */
  getAllTracks(): db.Track[] {
    return db.getAllTracks(this.dbPath);
  }

  /**
   * Add file associations to a track.
   *
   * @param trackId - Track ID
   * @param filePaths - File paths to associate
   */
  addFiles(trackId: string, filePaths: string[]): void {
    db.addTrackFiles(this.dbPath, trackId, filePaths);
  }

  /**
   * Add a blocking dependency between tracks.
   * The blocking track will block the blocked track.
   *
   * @param blockingId - The track that blocks
   * @param blockedId - The track that is blocked
   * @throws Error if tracks don't exist or would create a cycle
   */
  addDependency(blockingId: string, blockedId: string): void {
    db.addDependency(this.dbPath, blockingId, blockedId);
  }

  /**
   * Remove a blocking dependency between tracks.
   *
   * @param blockingId - The track that blocks
   * @param blockedId - The track that is blocked
   */
  removeDependency(blockingId: string, blockedId: string): void {
    db.removeDependency(this.dbPath, blockingId, blockedId);
  }

  /**
   * Check if adding a dependency would create a cycle.
   *
   * @param blockingId - The track that would block
   * @param blockedId - The track that would be blocked
   * @returns true if a cycle would be created
   */
  wouldCreateCycle(blockingId: string, blockedId: string): boolean {
    return db.wouldCreateCycle(this.dbPath, blockingId, blockedId);
  }

  /**
   * Get all tracks that block a given track.
   *
   * @param trackId - The track to check
   * @returns Array of blocking track IDs
   */
  getBlockersOf(trackId: string): string[] {
    return db.getBlockersOf(this.dbPath, trackId);
  }

  /**
   * Get all tracks that a given track blocks.
   *
   * @param trackId - The track to check
   * @returns Array of blocked track IDs
   */
  getBlockedBy(trackId: string): string[] {
    return db.getBlockedBy(this.dbPath, trackId);
  }

  /**
   * Check if all blockers of a track are done.
   *
   * @param trackId - The track to check
   * @returns true if all blockers are done
   */
  areAllBlockersDone(trackId: string): boolean {
    return db.areAllBlockersDone(this.dbPath, trackId);
  }

  /**
   * Check if a track has any blockers.
   *
   * @param trackId - The track to check
   * @returns true if the track has blockers
   */
  hasBlockers(trackId: string): boolean {
    return db.hasBlockers(this.dbPath, trackId);
  }
}

// Re-export database functions for advanced use cases
export {
  initializeDatabase,
  createTrack,
  updateTrack,
  getAllTracks,
  getAllTrackFiles,
  getAllDependencies,
  addDependency,
  removeDependency,
  wouldCreateCycle,
  getBlockersOf,
  getBlockedBy,
  areAllBlockersDone,
  hasBlockers,
} from './db.js';
