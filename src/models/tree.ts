import type { Track, TrackWithDetails, Kind } from './types.js';

/**
 * Build a tree structure from flat track data.
 * Derives the 'kind' field for each track based on parent_id and children.
 *
 * @param tracks - All tracks from the database
 * @param fileMap - Map of track IDs to file paths
 * @returns Array of tracks with derived fields (kind, files, children)
 */
export function buildTrackTree(
  tracks: Track[],
  fileMap: Map<string, string[]>
): TrackWithDetails[] {
  // Build lookup maps
  const tracksById = new Map<string, Track>();
  const childrenByParentId = new Map<string, Track[]>();

  // First pass: index all tracks
  for (const track of tracks) {
    tracksById.set(track.id, track);
  }

  // Second pass: build parent-child relationships
  for (const track of tracks) {
    if (track.parent_id !== null) {
      const siblings = childrenByParentId.get(track.parent_id) || [];
      siblings.push(track);
      childrenByParentId.set(track.parent_id, siblings);
    }
  }

  // Third pass: derive kind and build TrackWithDetails
  const tracksWithDetails: TrackWithDetails[] = [];

  for (const track of tracks) {
    const children = childrenByParentId.get(track.id) || [];
    const kind = deriveKind(track, children);
    const files = fileMap.get(track.id) || [];

    tracksWithDetails.push({
      ...track,
      kind,
      files,
      children: children.map((child) => child.id),
    });
  }

  return tracksWithDetails;
}

/**
 * Derive the kind of a track based on its parent_id and children.
 *
 * - super: parent_id == null (root track / project)
 * - feature: parent_id != null && has children
 * - task: parent_id != null && no children (leaf)
 *
 * @param track - The track to classify
 * @param children - The track's children
 * @returns The derived kind
 */
function deriveKind(track: Track, children: Track[]): Kind {
  if (track.parent_id === null) {
    return 'super';
  }

  if (children.length > 0) {
    return 'feature';
  }

  return 'task';
}
