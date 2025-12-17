/**
 * Track status lifecycle states.
 */
export type Status = 'planned' | 'in_progress' | 'done' | 'blocked' | 'superseded';

/**
 * Derived track kind (not stored in database).
 * Determined by parent_id and presence of children.
 */
export type Kind = 'super' | 'feature' | 'task';

/**
 * Track record as stored in the database.
 */
export interface Track {
  id: string;
  title: string;
  parent_id: string | null;
  summary: string;
  next_prompt: string;
  status: Status;
  worktree: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Track with derived fields and associations (for output).
 */
export interface TrackWithDetails extends Track {
  kind: Kind;
  files: string[];
  children: string[]; // Array of child track IDs
  blocks: string[]; // Array of track IDs this track blocks
  blocked_by: string[]; // Array of track IDs blocking this track
}

/**
 * Parameters for creating a new track.
 */
export interface CreateTrackParams {
  id: string;
  title: string;
  parent_id: string | null;
  summary: string;
  next_prompt: string;
  status: Status;
  worktree: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Parameters for updating an existing track.
 */
export interface UpdateTrackParams {
  summary: string;
  next_prompt: string;
  status: Status;
  worktree?: string | null;
  updated_at: string;
}

/**
 * Valid status values for validation.
 */
export const VALID_STATUSES: readonly Status[] = [
  'planned',
  'in_progress',
  'done',
  'blocked',
  'superseded',
] as const;

/**
 * Active status values (shown by default in status command).
 * These are tracks that are not yet completed or abandoned.
 */
export const ACTIVE_STATUSES: readonly Status[] = ['planned', 'in_progress', 'blocked'] as const;

/**
 * Check if a string is a valid status.
 */
export function isValidStatus(value: string): value is Status {
  return VALID_STATUSES.includes(value as Status);
}
