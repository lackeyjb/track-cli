import { projectExists, getDatabasePath, getCurrentWorktree } from '../utils/paths.js';
import { generateId } from '../utils/id.js';
import { getCurrentTimestamp } from '../utils/timestamp.js';
import * as lib from '../lib/db.js';
import type { CreateTrackParams } from '../models/types.js';

/**
 * Options for the new command.
 */
export interface NewCommandOptions {
  parent?: string;
  summary: string;
  next: string;
  file?: string[];
  worktree?: string;
  blocks?: string[];
}

/**
 * Create a new track (feature or task).
 *
 * @param title - Track title
 * @param options - Command options (parent, summary, next_prompt, files)
 * @throws Error if validation fails or track creation fails
 */
export function newCommand(title: string, options: NewCommandOptions): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  // 2. Validate title is non-empty
  if (!title || title.trim().length === 0) {
    console.error('Error: Track title cannot be empty.');
    process.exit(1);
  }

  const dbPath = getDatabasePath();

  // 3. Default to root track if no parent specified (enforce single-root constraint)
  let parentId = options.parent;
  if (!parentId) {
    const rootTrack = lib.getRootTrack(dbPath);
    if (!rootTrack) {
      console.error('Error: No root track found.');
      console.error('This should not happen. Try running "track init" again.');
      process.exit(1);
    }
    parentId = rootTrack.id;
  }

  // 4. Validate parent_id exists
  if (!lib.trackExists(dbPath, parentId)) {
    console.error(`Error: Unknown track id: ${parentId}`);
    console.error('The specified parent track does not exist.');
    process.exit(1);
  }

  try {
    // 5. Generate ID and timestamp
    const trackId = generateId();
    const now = getCurrentTimestamp();

    // 6. Determine worktree value
    // Priority: explicit --worktree flag > inherit from parent > auto-detect
    let worktree: string | null = null;
    if (options.worktree !== undefined) {
      // Explicit override
      worktree = options.worktree;
    } else {
      // Try to inherit from parent first
      const parentTrack = lib.getTrack(dbPath, parentId);
      if (parentTrack?.worktree) {
        worktree = parentTrack.worktree;
      } else {
        // Auto-detect from git worktree
        worktree = getCurrentWorktree();
      }
    }

    // 7. Build CreateTrackParams
    const newTrack: CreateTrackParams = {
      id: trackId,
      title: title.trim(),
      parent_id: parentId,
      summary: options.summary || '',
      next_prompt: options.next || '',
      status: 'planned',
      worktree,
      created_at: now,
      updated_at: now,
    };

    // 8. Create track in database
    lib.createTrack(dbPath, newTrack);

    // 9. Add file associations if provided
    if (options.file && options.file.length > 0) {
      lib.addTrackFiles(dbPath, trackId, options.file);
    }

    // 10. Handle --blocks dependencies
    const blockedTracks: string[] = [];
    if (options.blocks && options.blocks.length > 0) {
      for (const blockedId of options.blocks) {
        // Validate blocked track exists
        if (!lib.trackExists(dbPath, blockedId)) {
          console.error(`Error: Unknown track id: ${blockedId}`);
          console.error('The specified blocked track does not exist.');
          process.exit(1);
        }

        // Check for cycles (new track blocking blockedId)
        if (lib.wouldCreateCycle(dbPath, trackId, blockedId)) {
          console.error(`Error: Adding dependency would create a cycle.`);
          console.error(`Track ${trackId} cannot block ${blockedId}.`);
          process.exit(1);
        }

        // Create dependency record
        lib.addDependency(dbPath, trackId, blockedId);

        // Auto-set blocked track to "blocked" if it's "planned"
        const blockedTrack = lib.getTrack(dbPath, blockedId);
        if (blockedTrack && blockedTrack.status === 'planned') {
          lib.updateTrack(dbPath, blockedId, {
            summary: blockedTrack.summary,
            next_prompt: blockedTrack.next_prompt,
            status: 'blocked',
            updated_at: getCurrentTimestamp(),
          });
        }

        blockedTracks.push(blockedId);
      }
    }

    // 11. Success message
    console.log(`Created track: ${title}`);
    console.log(`Track ID: ${trackId}`);
    console.log(`Parent: ${parentId}`);
    if (worktree) {
      console.log(`Worktree: ${worktree}`);
    }
    if (options.file && options.file.length > 0) {
      console.log(`Files: ${options.file.length} file(s) associated`);
    }
    if (blockedTracks.length > 0) {
      console.log(`Blocks: ${blockedTracks.join(', ')}`);
    }
  } catch (error) {
    console.error('Error: Failed to create track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
