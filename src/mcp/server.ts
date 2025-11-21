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
  StatePayload,
} from './types.js';

const PATH_PREFIX = '/mcp/track';
const DEFAULT_PORT = 8765;

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

function handleRecentErrors(res: http.ServerResponse): void {
  sendJson(res, 501, { error: 'recent-errors resource not implemented yet' });
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
    handleRecentErrors(res);
    return;
  }

  notFound(res, `Unknown route: ${pathname}`);
}

export function startServer(port = DEFAULT_PORT): http.Server {
  const server = http.createServer(route);
  server.listen(port, '127.0.0.1', () => {
    console.log(`MCP server listening on http://127.0.0.1:${port}${PATH_PREFIX}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const port = Number.parseInt(process.env.MCP_PORT ?? '', 10);
  startServer(Number.isNaN(port) ? DEFAULT_PORT : port);
}
