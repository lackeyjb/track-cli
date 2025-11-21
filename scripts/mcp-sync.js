#!/usr/bin/env node
/**
 * Generate MCP metadata JSON files from a single source of truth.
 * Keeps payloads tiny and deterministic for agent consumption.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'src/mcp/data');
const SCHEMA_VERSION = 1;

const commands = [
  {
    name: 'init',
    summary: 'Initialize a new track project in the current directory',
    flags: [
      {
        name: 'force',
        alias: 'F',
        description: 'Overwrite existing .track directory if present',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    ],
    args: [{ name: 'name', required: false, description: 'Project name (defaults to directory name)' }],
    usage: 'track init [name] [-F|--force]',
    example: 'track init "My Project"',
  },
  {
    name: 'new',
    summary: 'Create a new track',
    flags: [
      { name: 'parent', description: 'Parent track ID', type: 'string', required: false },
      { name: 'summary', description: 'Current state description', type: 'string', required: false },
      { name: 'next', description: 'What to do next', type: 'string', required: false },
      {
        name: 'file',
        description: 'Associated file path (repeatable)',
        type: 'string[]',
        required: false,
      },
    ],
    args: [{ name: 'title', required: true, description: 'Track title' }],
    usage: 'track new "<title>" [--parent <track-id>] [--summary "..."] [--next "..."] [--file <path>]...',
    example: 'track new "Add login screen" --parent ROOT123 --summary "UI stub" --next "Hook API"',
  },
  {
    name: 'update',
    summary: 'Update the current state of an existing track',
    flags: [
      { name: 'summary', description: 'Updated state description', type: 'string', required: true },
      { name: 'next', description: 'What to do next', type: 'string', required: true },
      {
        name: 'status',
        description: 'Track status (planned|in_progress|done|blocked|superseded)',
        type: 'string',
        required: false,
        defaultValue: 'in_progress',
      },
      { name: 'file', description: 'Associated file path (repeatable)', type: 'string[]', required: false },
    ],
    args: [{ name: 'track-id', required: true, description: 'Track ID to update' }],
    usage:
      'track update <track-id> --summary "..." --next "..." [--status <status>] [--file <file-path>]...',
    example: 'track update ABC123 --summary "API wired" --next "Write tests" --status in_progress',
  },
  {
    name: 'status',
    summary: 'Display the current state of the project and all tracks',
    flags: [{ name: 'json', description: 'Output as JSON', type: 'boolean', required: false }],
    args: [],
    usage: 'track status [--json]',
    example: 'track status --json',
  },
];

function hashObject(obj) {
  const json = JSON.stringify(obj);
  const hash = createHash('sha1').update(json).digest('hex').slice(0, 12);
  return { json, etag: hash };
}

function makeEnvelope(data) {
  const lastUpdated = new Date().toISOString();
  const { json, etag } = hashObject(data);
  return {
    envelope: {
      data,
      lastUpdated,
      schemaVersion: SCHEMA_VERSION,
      etag,
    },
    json,
  };
}

async function writeEnvelope(filename, envelopeJson) {
  await mkdir(DATA_DIR, { recursive: true });
  const target = resolve(DATA_DIR, filename);
  await writeFile(target, `${envelopeJson}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`wrote ${filename}`);
}

async function main() {
  const pkgRaw = await readFile(resolve(ROOT, 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const commandsPayload = { commands: commands.map(({ example, ...rest }) => rest) };
  const examplesPayload = {
    examples: commands.map(({ name, example }) => ({ name, example })),
  };
  const versionPayload = { cli: `track-cli ${pkg.version}`, schema: SCHEMA_VERSION };
  const statePayload = { cwd: '', defaultConfig: '.track/config.json' };

  const { envelope: commandsEnv, json: commandsJson } = makeEnvelope(commandsPayload);
  const { envelope: examplesEnv, json: examplesJson } = makeEnvelope(examplesPayload);
  const { envelope: versionEnv, json: versionJson } = makeEnvelope(versionPayload);
  const { envelope: stateEnv, json: stateJson } = makeEnvelope(statePayload);

  await writeEnvelope('commands.json', JSON.stringify(commandsEnv, null, 2));
  await writeEnvelope('examples.json', JSON.stringify(examplesEnv, null, 2));
  await writeEnvelope('version.json', JSON.stringify(versionEnv, null, 2));
  await writeEnvelope('state.json', JSON.stringify(stateEnv, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('mcp:sync failed', error);
  process.exitCode = 1;
});
