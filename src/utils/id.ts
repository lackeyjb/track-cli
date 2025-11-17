import { nanoid } from 'nanoid';

/**
 * Generate a unique 8-character ID for tracks.
 * Uses nanoid with URL-safe alphabet (A-Za-z0-9_-).
 *
 * Collision resistance: ~94 years for 1% probability at 1000 IDs/hour
 *
 * @returns 8-character nanoid (e.g., "V1StGXR8")
 */
export function generateId(): string {
  return nanoid(8);
}
