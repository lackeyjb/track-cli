import http from 'node:http';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import {
  CommandsPayload,
  Envelope,
  ExamplesPayload,
  MAX_PAYLOAD_BYTES,
  RecentErrorsOptions,
  RecentErrorsPayload,
  StatePayload,
} from './types.js';

const PATH_PREFIX = '/mcp/track';
const DEFAULT_PORT = 8765;
const DEFAULT_MAX_RECENT_ERRORS = 20;
const DEFAULT_HOST = '127.0.0.1';

type EnvelopeMap = {
  commands: Envelope<CommandsPayload>;
  examples: Envelope<ExamplesPayload>;
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
  commands: loadEnvelope<CommandsPayload>('./data/commands.json'),
  examples: loadEnvelope<ExamplesPayload>('./data/examples.json'),
  state: loadEnvelope<StatePayload>('./data/state.json'),
  version: loadEnvelope<{ cli: string; schema: number }>('./data/version.json'),
};

function getRecentErrorsOptions(url: URL): RecentErrorsOptions {
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const maxLimit = DEFAULT_MAX_RECENT_ERRORS;
  const limit =
    Number.isNaN(requestedLimit) || requestedLimit <= 0 ? 5 : Math.min(requestedLimit, maxLimit);

  const logPath = process.env.MCP_ERRORS_FILE ?? '.track/mcp-errors.log';

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

function handleCommands(res: http.ServerResponse): void {
  const envelope = envelopes.commands;
  sendJson(res, 200, envelope, envelope.etag, envelope.lastUpdated);
}

function handleExamples(res: http.ServerResponse): void {
  const envelope = envelopes.examples;
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

function handleHelp(res: http.ServerResponse, command: string): void {
  const envelope = envelopes.commands;
  const found = envelope.data.commands.find((item) => item.name === command);

  if (!found) {
    notFound(res, `Unknown command "${command}"`);
    return;
  }

  const response: Envelope<{ command: typeof found }> = {
    data: { command: found },
    etag: `${envelope.etag}:${command}`,
    lastUpdated: envelope.lastUpdated,
    schemaVersion: envelope.schemaVersion,
  };

  sendJson(res, 200, response, response.etag, response.lastUpdated);
}

function handleExample(res: http.ServerResponse, command: string): void {
  const envelope = envelopes.examples;
  const found = envelope.data.examples.find((item) => item.name === command);

  if (!found) {
    notFound(res, `Unknown command "${command}"`);
    return;
  }

  const response: Envelope<{ example: typeof found }> = {
    data: { example: found },
    etag: `${envelope.etag}:${command}`,
    lastUpdated: envelope.lastUpdated,
    schemaVersion: envelope.schemaVersion,
  };

  sendJson(res, 200, response, response.etag, response.lastUpdated);
}

function handleRecentErrors(res: http.ServerResponse, url: URL): void {
  const envelope = buildRecentErrorsEnvelope(url);
  sendJson(res, 200, envelope, envelope.etag, envelope.lastUpdated);
}

function route(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (!req.url) {
    notFound(res, 'Missing URL');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname === `${PATH_PREFIX}/commands`) {
    handleCommands(res);
    return;
  }

  if (pathname === `${PATH_PREFIX}/examples`) {
    handleExamples(res);
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

  if (pathname.startsWith(`${PATH_PREFIX}/help/`)) {
    const command = pathname.replace(`${PATH_PREFIX}/help/`, '');
    handleHelp(res, command);
    return;
  }

  if (pathname.startsWith(`${PATH_PREFIX}/example/`)) {
    const command = pathname.replace(`${PATH_PREFIX}/example/`, '');
    handleExample(res, command);
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
