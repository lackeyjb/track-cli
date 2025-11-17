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
 * Check if a string is a valid status.
 */
export function isValidStatus(value: string): value is Status {
  return VALID_STATUSES.includes(value as Status);
}
