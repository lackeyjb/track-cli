#!/usr/bin/env node
/**
 * Generate MCP metadata JSON files from a single source of truth.
 * Keeps payloads tiny and deterministic for agent consumption.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandMetadata } from '../dist/commands/metadata.js';
import { commandMetadata } from '../dist/mcp/metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'src/mcp/data');
const SCHEMA_VERSION = 1;

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
  const commandsPayload = {
    commands: commandMetadata.map(({ example, cliFlag: _cliFlag, flags, ...rest }) => ({
      ...rest,
      flags: flags.map(({ cliFlag, ...flagRest }) => flagRest),
    })),
  };
  const examplesPayload = {
    examples: commandMetadata.map(({ name, example }) => ({ name, example })),
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
