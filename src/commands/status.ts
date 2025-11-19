import { projectExists, getDatabasePath } from '../utils/paths.js';
import * as lib from '../lib/db.js';
import { buildTrackTree } from '../models/tree.js';
import type { TrackWithDetails } from '../models/types.js';

/**
 * Options for the status command.
 */
export interface StatusCommandOptions {
  json?: boolean;
}

/**
 * Display the current state of the project and all tracks.
 *
 * @param options - Command options (json flag)
 * @throws Error if project doesn't exist or database query fails
 */
export function statusCommand(options: StatusCommandOptions): void {
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

    // 4. Build tree structure with derived fields
    const tracksWithDetails = buildTrackTree(tracks, fileMap);

    // 5. Output in requested format
    if (options.json) {
      outputJson(tracksWithDetails);
    } else {
      outputHuman(tracksWithDetails);
    }
  } catch (error) {
    console.error('Error: Failed to retrieve project status.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

/**
 * Output tracks in JSON format.
 */
function outputJson(tracks: TrackWithDetails[]): void {
  const output = {
    tracks,
  };
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Output tracks in human-readable tree format.
 */
function outputHuman(tracks: TrackWithDetails[]): void {
  // Find the root track (project)
  const rootTrack = tracks.find((t) => t.parent_id === null);

  if (!rootTrack) {
    console.log('No tracks found.');
    return;
  }

  // Build a map for quick child lookup
  const trackMap = new Map<string, TrackWithDetails>();
  for (const track of tracks) {
    trackMap.set(track.id, track);
  }

  // Print project header
  console.log(`Project: ${rootTrack.title} (${rootTrack.id})`);
  console.log();

  // Print tree starting from root
  printTrack(rootTrack, trackMap, 0);
}

/**
 * Recursively print a track and its children with indentation.
 *
 * @param track - Track to print
 * @param trackMap - Map of all tracks for child lookup
 * @param depth - Current depth in tree (for indentation)
 */
function printTrack(
  track: TrackWithDetails,
  trackMap: Map<string, TrackWithDetails>,
  depth: number
): void {
  const indent = '  '.repeat(depth);

  // Print track header: [kind] id - title
  console.log(`${indent}[${track.kind}] ${track.id} - ${track.title}`);

  // Print track details (summary, next, status, files) with extra indentation
  const detailIndent = '  '.repeat(depth + 1);
  console.log(`${detailIndent}summary: ${track.summary}`);
  console.log(`${detailIndent}next:    ${track.next_prompt}`);
  console.log(`${detailIndent}status:  ${track.status}`);

  if (track.files.length > 0) {
    console.log(`${detailIndent}files:   ${track.files.join(', ')}`);
  }

  // Print blank line between tracks (except for last leaf)
  if (track.children.length > 0) {
    console.log();
  }

  // Recursively print children
  for (let i = 0; i < track.children.length; i++) {
    const childId = track.children[i];
    if (childId) {
      const child = trackMap.get(childId);
      if (child) {
        printTrack(child, trackMap, depth + 1);
        // Add blank line between siblings (except after last sibling)
        if (i < track.children.length - 1) {
          console.log();
        }
      }
    }
  }
}
