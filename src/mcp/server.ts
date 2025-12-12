import http from 'node:http';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { TrackManager } from '../lib/index.js';
import { ACTIVE_STATUSES } from '../models/types.js';
import {
  Envelope,
  QuickstartPayload,
  RecipesPayload,
  TracksPayload,
  RecentErrorsOptions,
  RecentErrorsPayload,
  StatePayload,
} from './types.js';
import {
  DEFAULT_ERRORS_LOG_PATH,
  DEFAULT_HOST,
  DEFAULT_MAX_RECENT_ERRORS,
  DEFAULT_PORT,
  DEFAULT_RECENT_ERRORS_LIMIT,
  MAX_PAYLOAD_BYTES,
  PATH_PREFIX,
} from './constants.js';

type EnvelopeMap = {
  quickstart: Envelope<QuickstartPayload>;
  recipes: Envelope<RecipesPayload>;
  state: Envelope<StatePayload>;
  version: Envelope<{ cli: string; schema: number }>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvelope<T>(relativePath: string): Envelope<T> {
  const fullPath = resolve(__dirname, relativePath);
  const raw = readFileSync(fullPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return parsed as Envelope<T>;
}

const envelopes: EnvelopeMap = {
  quickstart: loadEnvelope<QuickstartPayload>('./data/quickstart.json'),
  recipes: loadEnvelope<RecipesPayload>('./data/recipes.json'),
  state: loadEnvelope<StatePayload>('./data/state.json'),
  version: loadEnvelope<{ cli: string; schema: number }>('./data/version.json'),
};

function getRecentErrorsOptions(url: URL): RecentErrorsOptions {
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const maxLimit = DEFAULT_MAX_RECENT_ERRORS;
  const limit =
    Number.isNaN(requestedLimit) || requestedLimit <= 0
      ? DEFAULT_RECENT_ERRORS_LIMIT
      : Math.min(requestedLimit, maxLimit);

  const logPath = process.env.MCP_ERRORS_FILE ?? DEFAULT_ERRORS_LOG_PATH;

  return { limit, maxLimit, logPath };
}

function readRecentErrors({ limit, logPath }: RecentErrorsOptions): RecentErrorsPayload {
  try {
    const fullPath = resolve(process.cwd(), logPath);
    const raw = readFileSync(fullPath, 'utf8');
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const entries = lines
      .slice(-limit)
      .reverse()
      .map((line) => {
        try {
          const parsed = JSON.parse(line) as { timestamp?: string; message?: string };
          return {
            timestamp: parsed.timestamp ?? new Date().toISOString(),
            message: parsed.message ?? line,
          };
        } catch {
          return { timestamp: new Date().toISOString(), message: line };
        }
      });

    return { errors: entries };
  } catch {
    return { errors: [] };
  }
}

function buildRecentErrorsEnvelope(url: URL): Envelope<RecentErrorsPayload> {
  const now = new Date().toISOString();
  const errors = readRecentErrors(getRecentErrorsOptions(url));
  return {
    data: errors,
    etag: `recent:${errors.errors.length}:${now}`,
    lastUpdated: now,
    schemaVersion: envelopes.version.schemaVersion,
  };
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: Envelope<unknown> | { error: string },
  etag?: string,
  lastModified?: string
): void {
  const payload = JSON.stringify(body);
  const size = Buffer.byteLength(payload, 'utf8');

  if (size > MAX_PAYLOAD_BYTES) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: `Payload exceeded ${MAX_PAYLOAD_BYTES} bytes (${size}). Trim resource data before serving.`,
      })
    );
    return;
  }

  res.writeHead(status, {
    'Content-Type': 'application/json',
    ETag: etag,
    'Last-Modified': lastModified,
    'Content-Length': size,
  });
  res.end(payload);
}

function notFound(res: http.ServerResponse, detail: string): void {
  sendJson(res, 404, { error: detail });
}

function handleQuickstart(res: http.ServerResponse): void {
  const envelope = envelopes.quickstart;
  sendJson(res, 200, envelope, envelope.etag, envelope.lastUpdated);
}

function handleRecipes(res: http.ServerResponse): void {
  const envelope = envelopes.recipes;
  sendJson(res, 200, envelope, envelope.etag, envelope.lastUpdated);
}

function handleVersion(res: http.ServerResponse): void {
  const envelope = envelopes.version;
  sendJson(res, 200, envelope, envelope.etag, envelope.lastUpdated);
}

function handleState(res: http.ServerResponse): void {
  const envelope = {
    ...envelopes.state,
    data: {
      ...envelopes.state.data,
      cwd: process.cwd(),
    },
  };
  sendJson(res, 200, envelope, envelope.etag, envelope.lastUpdated);
}

function handleRecentErrors(res: http.ServerResponse, url: URL): void {
  const envelope = buildRecentErrorsEnvelope(url);
  sendJson(res, 200, envelope, envelope.etag, envelope.lastUpdated);
}

function handleStatus(res: http.ServerResponse, url: URL): void {
  const dbPath = resolve(process.cwd(), '.track/track.db');

  if (!existsSync(dbPath)) {
    sendJson(res, 404, { error: 'No track database found in current directory' });
    return;
  }

  try {
    const manager = new TrackManager(dbPath);
    const { tracks } = manager.getStatus();

    // Check for ?all=true to show all tracks (default: active only)
    const showAll = url.searchParams.get('all') === 'true';

    // Optional filtering
    const statusFilter = url.searchParams.get('status');
    const kindFilter = url.searchParams.get('kind');
    const parentFilter = url.searchParams.get('parent');

    let filtered = tracks;

    // Default to active tracks only (unless ?all=true or explicit status filter)
    if (!showAll && !statusFilter) {
      const activeStatuses = new Set(ACTIVE_STATUSES);
      filtered = filtered.filter((t) => t.parent_id === null || activeStatuses.has(t.status));
    }

    if (statusFilter) {
      const statuses = statusFilter.split(',');
      filtered = filtered.filter((t) => statuses.includes(t.status));
    }

    if (kindFilter) {
      const kinds = kindFilter.split(',');
      filtered = filtered.filter((t) => kinds.includes(t.kind));
    }

    if (parentFilter) {
      filtered = filtered.filter((t) => t.parent_id === parentFilter);
    }

    const now = new Date().toISOString();
    const envelope: Envelope<TracksPayload> = {
      data: { tracks: filtered },
      etag: `status:${tracks.length}:${Date.now()}`,
      lastUpdated: now,
      schemaVersion: envelopes.version.data.schema,
    };

    sendJson(res, 200, envelope, envelope.etag, envelope.lastUpdated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, 500, { error: `Failed to read track status: ${message}` });
  }
}

function route(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (!req.url) {
    notFound(res, 'Missing URL');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === `${PATH_PREFIX}/quickstart`) {
    handleQuickstart(res);
    return;
  }

  if (pathname === `${PATH_PREFIX}/recipes`) {
    handleRecipes(res);
    return;
  }

  if (pathname === `${PATH_PREFIX}/status`) {
    handleStatus(res, url);
    return;
  }

  if (pathname === `${PATH_PREFIX}/version`) {
    handleVersion(res);
    return;
  }

  if (pathname === `${PATH_PREFIX}/state`) {
    handleState(res);
    return;
  }

  if (pathname === `${PATH_PREFIX}/recent-errors`) {
    handleRecentErrors(res, url);
    return;
  }

  notFound(res, `Unknown route: ${pathname}`);
}

// Helper for tests: simulate a request without opening a real socket.
export function handleRequest(url: string): {
  status: number;
  headers: Record<string, unknown>;
  body: string;
} {
  const req = { url } as http.IncomingMessage;
  const res: {
    status?: number;
    headers?: Record<string, unknown>;
    body?: string;
    writeHead: (status: number, headers?: Record<string, unknown>) => void;
    end: (body?: unknown) => void;
  } = {
    writeHead(status, headers = {}) {
      this.status = status;
      this.headers = headers;
    },
    end(body = '') {
      this.body = typeof body === 'string' ? body : JSON.stringify(body);
    },
  };

  route(req, res as unknown as http.ServerResponse);

  return {
    status: res.status ?? 0,
    headers: res.headers ?? {},
    body: res.body ?? '',
  };
}

export function startServer(port = DEFAULT_PORT, host = DEFAULT_HOST): http.Server {
  // Security warning for non-localhost binding
  const isLocalhost = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  if (!isLocalhost) {
    console.warn(
      `\n⚠️  WARNING: MCP server is binding to ${host}, which may expose it to external networks.`
    );
    console.warn(
      `   For security, consider using 127.0.0.1 (localhost) unless you have a specific need.\n`
    );
  }

  const server = http.createServer(route);
  server.listen(port, host, () => {
    console.log(`MCP server listening on http://${host}:${port}${PATH_PREFIX}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const port = Number.parseInt(process.env.MCP_PORT ?? '', 10);
  const host = process.env.MCP_HOST ?? DEFAULT_HOST;
  startServer(Number.isNaN(port) ? DEFAULT_PORT : port, host);
}
