import { projectExists, getDatabasePath } from '../utils/paths.js';
import * as lib from '../lib/db.js';
import { buildTrackTree } from '../models/tree.js';
import type { TrackWithDetails } from '../models/types.js';
import { colorKind, colorStatus, formatLabel, getTerminalWidth } from '../utils/format.js';

/**
 * Options for the show command.
 */
export interface ShowCommandOptions {
  json?: boolean;
}

/**
 * Display details for a specific track.
 *
 * @param trackId - The track ID to display
 * @param options - Command options (json flag)
 * @throws Error if project doesn't exist, track not found, or database query fails
 */
export function showCommand(trackId: string, options: ShowCommandOptions): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    process.exit(1);
  }

  try {
    const dbPath = getDatabasePath();

    // 2. Load all tracks from database
    const tracks = lib.getAllTracks(dbPath);

    // 3. Load all track-file associations
    const fileMap = lib.getAllTrackFiles(dbPath);

    // 4. Load all dependencies
    const dependencyMap = lib.getAllDependencies(dbPath);

    // 5. Build tree structure with derived fields
    const tracksWithDetails = buildTrackTree(tracks, fileMap, dependencyMap);

    // 6. Find the requested track
    const track = tracksWithDetails.find((t) => t.id === trackId);

    if (!track) {
      console.error(`Error: Unknown track id: ${trackId}`);
      process.exit(1);
    }

    // 7. Output in requested format
    if (options.json) {
      outputJson(track);
    } else {
      outputHuman(track);
    }
  } catch (error) {
    console.error('Error: Failed to retrieve track details.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

/**
 * Output track in JSON format.
 */
function outputJson(track: TrackWithDetails): void {
  console.log(JSON.stringify(track, null, 2));
}

/**
 * Output track in human-readable format.
 */
function outputHuman(track: TrackWithDetails): void {
  const terminalWidth = getTerminalWidth();
  const indent = '  ';

  const labelOptions = {
    labelWidth: 8,
    maxWidth: terminalWidth - indent.length,
    continuationIndent: indent,
  };

  // Print track header: [kind] id - title @worktree
  const worktreeSuffix = track.worktree ? ` @${track.worktree}` : '';
  console.log(`[${colorKind(track.kind)}] ${track.id} - ${track.title}${worktreeSuffix}`);

  // Print track details with indentation
  console.log(`${indent}${formatLabel('summary:', track.summary, labelOptions)}`);
  console.log(`${indent}${formatLabel('next:', track.next_prompt, labelOptions)}`);
  console.log(`${indent}${formatLabel('status:', colorStatus(track.status), labelOptions)}`);

  if (track.worktree) {
    console.log(`${indent}${formatLabel('worktree:', track.worktree, labelOptions)}`);
  }

  if (track.files.length > 0) {
    console.log(`${indent}${formatLabel('files:', track.files.join(', '), labelOptions)}`);
  }

  if (track.blocks.length > 0) {
    console.log(`${indent}${formatLabel('blocks:', track.blocks.join(', '), labelOptions)}`);
  }

  if (track.blocked_by.length > 0) {
    console.log(
      `${indent}${formatLabel('blocked by:', track.blocked_by.join(', '), labelOptions)}`
    );
  }
}
