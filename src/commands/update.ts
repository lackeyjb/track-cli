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

    // 5. Update track in database
    lib.updateTrack(dbPath, trackId, updateParams);

    // 6. Add file associations if provided
    if (options.file && options.file.length > 0) {
      lib.addTrackFiles(dbPath, trackId, options.file);
    }

    // 7. Success message
    console.log(`Updated track: ${trackId}`);
    console.log(`Status: ${status}`);
    if (options.file && options.file.length > 0) {
      console.log(`Files: ${options.file.length} file(s) associated`);
    }
  } catch (error) {
    console.error('Error: Failed to update track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
