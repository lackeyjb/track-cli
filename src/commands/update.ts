import { projectExists, getDatabasePath } from '../utils/paths.js';
import { getCurrentTimestamp } from '../utils/timestamp.js';
import * as lib from '../lib/db.js';
import { isValidStatus, VALID_STATUSES } from '../models/types.js';
import type { UpdateTrackParams, Status } from '../models/types.js';

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  summary: string;
  next: string;
  status?: string;
  file?: string[];
  worktree?: string;
  blocks?: string[];
  unblocks?: string[];
}

/**
 * Update an existing track's state (summary, next_prompt, status, files).
 *
 * @param trackId - Track ID to update
 * @param options - Command options (summary, next_prompt, status, files)
 * @throws Error if validation fails or track update fails
 */
export function updateCommand(trackId: string, options: UpdateCommandOptions): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  const dbPath = getDatabasePath();

  // 2. Validate track exists
  if (!lib.trackExists(dbPath, trackId)) {
    console.error(`Error: Unknown track id: ${trackId}`);
    console.error('The specified track does not exist.');
    process.exit(1);
  }

  // 3. Validate and normalize status
  const status: Status = options.status
    ? isValidStatus(options.status)
      ? options.status
      : (() => {
          console.error(`Error: Invalid status: ${options.status}`);
          console.error(`Valid statuses: ${VALID_STATUSES.join(', ')}`);
          process.exit(1);
        })()
    : 'in_progress';

  try {
    // 4. Build UpdateTrackParams
    const updateParams: UpdateTrackParams = {
      summary: options.summary,
      next_prompt: options.next,
      status,
      updated_at: getCurrentTimestamp(),
    };

    // 5. Handle worktree if provided
    // '-' means unset (set to null), otherwise set to the provided value
    if (options.worktree !== undefined) {
      updateParams.worktree = options.worktree === '-' ? null : options.worktree;
    }

    // 6. Update track in database
    lib.updateTrack(dbPath, trackId, updateParams);

    // 7. Add file associations if provided
    if (options.file && options.file.length > 0) {
      lib.addTrackFiles(dbPath, trackId, options.file);
    }

    // 8. Handle --blocks dependencies (add new blocking relationships)
    const addedBlocks: string[] = [];
    if (options.blocks && options.blocks.length > 0) {
      for (const blockedId of options.blocks) {
        // Validate blocked track exists
        if (!lib.trackExists(dbPath, blockedId)) {
          console.error(`Error: Unknown track id: ${blockedId}`);
          console.error('The specified blocked track does not exist.');
          process.exit(1);
        }

        // Check for cycles
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

        addedBlocks.push(blockedId);
      }
    }

    // 9. Handle --unblocks dependencies (remove blocking relationships)
    const removedBlocks: string[] = [];
    if (options.unblocks && options.unblocks.length > 0) {
      for (const blockedId of options.unblocks) {
        // Remove dependency record (no validation needed - OK if doesn't exist)
        lib.removeDependency(dbPath, trackId, blockedId);

        // If blocked track has no remaining blockers AND status is "blocked" AND has dependency records
        // then change to "planned"
        const blockedTrack = lib.getTrack(dbPath, blockedId);
        if (blockedTrack && blockedTrack.status === 'blocked') {
          const remainingBlockers = lib.getBlockersOf(dbPath, blockedId);
          // Only auto-unblock if there are no remaining blockers and it was dependency-blocked
          if (remainingBlockers.length === 0) {
            lib.updateTrack(dbPath, blockedId, {
              summary: blockedTrack.summary,
              next_prompt: blockedTrack.next_prompt,
              status: 'planned',
              updated_at: getCurrentTimestamp(),
            });
          }
        }

        removedBlocks.push(blockedId);
      }
    }

    // 10. Handle status cascade when marked "done"
    const unblockedTracks: string[] = [];
    if (status === 'done') {
      // Get all tracks this one blocks
      const blockedByThis = lib.getBlockedBy(dbPath, trackId);
      for (const blockedId of blockedByThis) {
        const blockedTrack = lib.getTrack(dbPath, blockedId);
        // Only auto-unblock if:
        // - Track exists
        // - Track status is "blocked"
        // - Track has dependency records (not manually blocked)
        // - All its blockers are now done
        if (
          blockedTrack &&
          blockedTrack.status === 'blocked' &&
          lib.hasBlockers(dbPath, blockedId) &&
          lib.areAllBlockersDone(dbPath, blockedId)
        ) {
          lib.updateTrack(dbPath, blockedId, {
            summary: blockedTrack.summary,
            next_prompt: blockedTrack.next_prompt,
            status: 'planned',
            updated_at: getCurrentTimestamp(),
          });
          unblockedTracks.push(blockedId);
        }
      }
    }

    // 11. Success message
    console.log(`Updated track: ${trackId}`);
    console.log(`Status: ${status}`);
    if (options.worktree !== undefined) {
      if (options.worktree === '-') {
        console.log('Worktree: (unset)');
      } else {
        console.log(`Worktree: ${options.worktree}`);
      }
    }
    if (options.file && options.file.length > 0) {
      console.log(`Files: ${options.file.length} file(s) associated`);
    }
    if (addedBlocks.length > 0) {
      console.log(`Now blocks: ${addedBlocks.join(', ')}`);
    }
    if (removedBlocks.length > 0) {
      console.log(`No longer blocks: ${removedBlocks.join(', ')}`);
    }
    if (unblockedTracks.length > 0) {
      console.log(`Unblocked tracks: ${unblockedTracks.join(', ')}`);
    }
  } catch (error) {
    console.error('Error: Failed to update track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
