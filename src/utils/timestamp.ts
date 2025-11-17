/**
 * Get the current timestamp in ISO 8601 UTC format.
 * Format: YYYY-MM-DDTHH:MM:SSZ
 *
 * This format is:
 * - Human-readable
 * - Sortable (lexicographic order = chronological order)
 * - Storable as TEXT in SQLite
 *
 * @returns Current timestamp (e.g., "2025-11-17T10:30:00.000Z")
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
