import { projectExists, getDatabasePath } from '../utils/paths.js';
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

    // 6. Build CreateTrackParams
    const newTrack: CreateTrackParams = {
      id: trackId,
      title: title.trim(),
      parent_id: parentId,
      summary: options.summary || '',
      next_prompt: options.next || '',
      status: 'planned',
      created_at: now,
      updated_at: now,
    };

    // 7. Create track in database
    lib.createTrack(dbPath, newTrack);

    // 8. Add file associations if provided
    if (options.file && options.file.length > 0) {
      lib.addTrackFiles(dbPath, trackId, options.file);
    }

    // 9. Success message
    console.log(`Created track: ${title}`);
    console.log(`Track ID: ${trackId}`);
    console.log(`Parent: ${parentId}`);
    if (options.file && options.file.length > 0) {
      console.log(`Files: ${options.file.length} file(s) associated`);
    }
  } catch (error) {
    console.error('Error: Failed to create track.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
