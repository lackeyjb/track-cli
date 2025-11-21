# MCP Server Guide

The MCP server exposes a minimal, cached view of Track CLI metadata for AI coding agents. It is side-effect free and bounded to small JSON payloads.

## Endpoints (HTTP)
- `/mcp/track/commands` — list commands, flags, args.
- `/mcp/track/examples` — shortest valid example per command.
- `/mcp/track/help/{command}` — usage + flags for one command.
- `/mcp/track/example/{command}` — example for one command.
- `/mcp/track/version` — CLI + schema version.
- `/mcp/track/state` — cwd (runtime) + default config path.
- `/mcp/track/recent-errors?[limit=n]` — newest log entries (best-effort, bounded).

All responses share envelope fields: `data`, `lastUpdated`, `schemaVersion`, `etag`.

## Environment Variables
- `MCP_PORT` (default `8765`) — listening port.
- `MCP_HOST` (default `127.0.0.1`) — listening host.
- `MCP_ERRORS_FILE` (default `.track/mcp-errors.log`) — source log for recent-errors.

## Scripts
- `npm run mcp:sync` — regenerate metadata JSON envelopes and rebuild.
- `npm run mcp:start` — start compiled server from `dist`.
- `npm run mcp:dev` — dev compile watch (server not auto-run).

## Data Regeneration
`scripts/mcp-sync.js` is the single source of truth for command metadata. Update it when commands/flags change, then run `npm run mcp:sync` to refresh envelopes and `dist` artifacts.

## Size & Safety
- Payloads capped at 5 KB; server returns 500 if exceeded.
- recent-errors is best-effort: returns empty array if log missing or unreadable.

## Sample usage
```bash
MCP_PORT=8877 npm run mcp:start &
curl -s http://127.0.0.1:8877/mcp/track/commands | jq .
curl -s "http://127.0.0.1:8877/mcp/track/recent-errors?limit=3" | jq .
```
