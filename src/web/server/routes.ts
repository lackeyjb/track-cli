import { Hono } from 'hono';
import type { TrackManager } from '../../lib/index.js';
import type { Status } from '../../lib/types.js';

interface CreateTrackBody {
  title: string;
  parent_id?: string | null;
  summary?: string;
  next_prompt?: string;
  status?: Status;
  worktree?: string | null;
  files?: string[];
}

interface UpdateTrackBody {
  summary?: string;
  next_prompt?: string;
  status: Status;
  worktree?: string | null;
  files?: string[];
}

interface AddFilesBody {
  files: string[];
}

interface AddDependencyBody {
  blocking_id: string;
}

export function apiRoutes(manager: TrackManager): Hono {
  const api = new Hono();

  // GET /api/web/status - Get all tracks (tree structure)
  api.get('/status', (c) => {
    const status = manager.getStatus();
    return c.json(status);
  });

  // GET /api/web/tracks/:id - Get single track
  api.get('/tracks/:id', (c) => {
    const id = c.req.param('id');
    const track = manager.getTrack(id);
    if (!track) {
      return c.json({ error: 'Track not found' }, 404);
    }
    return c.json(track);
  });

  // POST /api/web/tracks - Create track
  api.post('/tracks', async (c) => {
    const body = await c.req.json<CreateTrackBody>();

    if (!body.title) {
      return c.json({ error: 'Missing required field: title' }, 400);
    }

    const track = manager.createTrack({
      title: body.title,
      parent_id: body.parent_id ?? null,
      summary: body.summary ?? '',
      next_prompt: body.next_prompt ?? '',
      status: body.status,
      worktree: body.worktree ?? null,
      files: body.files,
    });

    return c.json(track, 201);
  });

  // PATCH /api/web/tracks/:id - Update track
  api.patch('/tracks/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<UpdateTrackBody>();

    const existing = manager.getTrack(id);
    if (!existing) {
      return c.json({ error: 'Track not found' }, 404);
    }

    if (!body.status) {
      return c.json({ error: 'Missing required field: status' }, 400);
    }

    manager.updateTrack(id, {
      summary: body.summary ?? existing.summary,
      next_prompt: body.next_prompt ?? existing.next_prompt,
      status: body.status,
      worktree: body.worktree,
      files: body.files,
    });

    const updated = manager.getTrack(id);
    return c.json(updated);
  });

  // POST /api/web/tracks/:id/files - Add files to track
  api.post('/tracks/:id/files', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<AddFilesBody>();

    if (!manager.trackExists(id)) {
      return c.json({ error: 'Track not found' }, 404);
    }

    if (!body.files || !Array.isArray(body.files)) {
      return c.json({ error: 'Missing required field: files (array)' }, 400);
    }

    manager.addFiles(id, body.files);
    return c.json({ success: true });
  });

  // POST /api/web/tracks/:id/dependencies - Add blocker
  api.post('/tracks/:id/dependencies', async (c) => {
    const blockedId = c.req.param('id');
    const body = await c.req.json<AddDependencyBody>();

    if (!manager.trackExists(blockedId)) {
      return c.json({ error: 'Track not found' }, 404);
    }

    if (!body.blocking_id) {
      return c.json({ error: 'Missing required field: blocking_id' }, 400);
    }

    if (!manager.trackExists(body.blocking_id)) {
      return c.json({ error: 'Blocking track not found' }, 404);
    }

    if (manager.wouldCreateCycle(body.blocking_id, blockedId)) {
      return c.json({ error: 'Adding this dependency would create a cycle' }, 400);
    }

    manager.addDependency(body.blocking_id, blockedId);
    return c.json({ success: true }, 201);
  });

  // DELETE /api/web/tracks/:id/dependencies/:blockingId - Remove blocker
  api.delete('/tracks/:id/dependencies/:blockingId', (c) => {
    const blockedId = c.req.param('id');
    const blockingId = c.req.param('blockingId');

    if (!manager.trackExists(blockedId)) {
      return c.json({ error: 'Track not found' }, 404);
    }

    manager.removeDependency(blockingId, blockedId);
    return c.json({ success: true });
  });

  return api;
}
