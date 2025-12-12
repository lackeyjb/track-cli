import { projectExists, getDatabasePath } from '../utils/paths.js';
import * as lib from '../lib/db.js';
import { buildTrackTree } from '../models/tree.js';
import { ACTIVE_STATUSES } from '../models/types.js';
import type { TrackWithDetails } from '../models/types.js';
import { TREE, colorKind, colorStatus, formatLabel } from '../utils/format.js';

/**
 * Options for the status command.
 */
export interface StatusCommandOptions {
  json?: boolean;
  all?: boolean;
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

    // 2. Load tracks from database (filtered by default, all with --all flag)
    let tracks = options.all
      ? lib.getAllTracks(dbPath)
      : lib.getTracksByStatus(dbPath, ACTIVE_STATUSES);

    // 3. Always include root track for project context, even if filtered
    if (!options.all) {
      const rootTrack = lib.getRootTrack(dbPath);
      if (rootTrack && !tracks.find((t) => t.id === rootTrack.id)) {
        tracks = [rootTrack, ...tracks];
      }
    }

    // 4. Load all track-file associations
    const fileMap = lib.getAllTrackFiles(dbPath);

    // 5. Build tree structure with derived fields
    const tracksWithDetails = buildTrackTree(tracks, fileMap);

    // 6. Output in requested format
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
  printTrack(rootTrack, trackMap, [], true);
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
  prefixParts: string[],
  isLast: boolean
): void {
  const nodePrefix = prefixParts.join('') + (isLast ? TREE.LAST : TREE.BRANCH) + ' ';
  const detailsPrefix = prefixParts.join('') + (isLast ? TREE.SPACE : TREE.PIPE) + '  ';

  console.log(`${nodePrefix}[${colorKind(track.kind)}] ${track.id} - ${track.title}`);

  console.log(`${detailsPrefix}${formatLabel('summary:', track.summary)}`);
  console.log(`${detailsPrefix}${formatLabel('next:', track.next_prompt)}`);
  console.log(`${detailsPrefix}${formatLabel('status:', colorStatus(track.status))}`);

  if (track.files.length > 0) {
    console.log(`${detailsPrefix}${formatLabel('files:', track.files.join(', '))}`);
  }

  const children = track.children.filter(Boolean);
  if (children.length > 0) {
    console.log();
  }

  for (let i = 0; i < children.length; i++) {
    const childId = children[i];
    if (!childId) continue;
    const child = trackMap.get(childId);
    if (!child) continue;

    const childIsLast = i === children.length - 1;
    const childPrefixParts = [...prefixParts, isLast ? TREE.SPACE : TREE.PIPE];

    printTrack(child, trackMap, childPrefixParts, childIsLast);
    if (i < children.length - 1) {
      console.log();
    }
  }
}
