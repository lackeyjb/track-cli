# MCP Server Guide

The MCP server exposes a minimal, cached view of Track CLI metadata for AI coding agents. It is side-effect free and bounded to small JSON payloads.

## Endpoints (HTTP)

All responses share envelope fields: `data`, `lastUpdated`, `schemaVersion`, `etag`.

### `/mcp/track/quickstart`
Get essential command patterns and session workflow (~400 tokens).

**Example response:**
```json
{
  "data": {
    "commands": {
      "init": "track init [name]",
      "new": "track new \"<title>\" [--parent <id>] [--summary \"...\"] [--next \"...\"] [--file <path>]",
      "update": "track update <id> --summary \"...\" --next \"...\" [--status <s>] [--file <path>]",
      "status": "track status [--json]"
    },
    "session_pattern": [
      "Start: track status --json | jq '.tracks[] | select(.status==\"in_progress\")'",
      "Work: Create/update tracks with clear summary and next_prompt",
      "End: Update with comprehensive summary + specific next steps"
    ],
    "breadcrumb": "<file>: do <step>; then <step>. Acceptance: <result>. Context: <why>.",
    "statuses": "planned → in_progress → done|blocked|superseded",
    "json_fields": "id, title, parent_id, summary, next_prompt, status, files[], children[], kind (super|feature|task), created_at, updated_at",
    "required_flags": {
      "new": "title required; --summary, --next optional but recommended",
      "update": "id required; --summary, --next recommended; --status defaults to in_progress"
    }
  },
  "etag": "quickstart:v2",
  "lastUpdated": "2025-01-21T00:00:00Z",
  "schemaVersion": 2
}
```

### `/mcp/track/recipes`
Get jq one-liners for common queries (~300 tokens).

**Example response:**
```json
{
  "data": {
    "recipes": [
      {
        "name": "in_progress_tracks",
        "jq": ".tracks[] | select(.status==\"in_progress\") | {id, title, kind}",
        "description": "All in-progress tracks (id + title)"
      },
      {
        "name": "next_steps",
        "jq": ".tracks[] | select(.status==\"in_progress\") | {title, next: .next_prompt}",
        "description": "Active next prompts for current work"
      },
      {
        "name": "blocked_tracks",
        "jq": ".tracks[] | select(.status==\"blocked\") | {title, parent: .parent_id, why: .summary}",
        "description": "Blocked tracks with context for escalation"
      }
    ]
  },
  "etag": "recipes:v2",
  "lastUpdated": "2025-01-21T00:00:00Z",
  "schemaVersion": 2
}
```

### `/mcp/track/status`
Get live project status with optional filtering (variable size).

**Query parameters:**
- `status` — Filter by status (comma-separated): `?status=in_progress,planned`
- `kind` — Filter by kind (comma-separated): `?kind=task,feature`
- `parent` — Filter by parent ID: `?parent=abc123`

**Example request:** `/mcp/track/status?status=in_progress`

**Example response:**
```json
{
  "data": {
    "tracks": [
      {
        "id": "abc12345",
        "title": "Implement login",
        "parent_id": "xyz99999",
        "kind": "task",
        "summary": "Form built, API integration pending",
        "next_prompt": "src/api/auth.ts: wire login endpoint; test with valid credentials",
        "status": "in_progress",
        "files": ["src/components/LoginForm.tsx", "src/hooks/useLogin.ts"],
        "children": [],
        "created_at": "2025-11-20T10:00:00Z",
        "updated_at": "2025-11-21T14:30:00Z"
      }
    ]
  },
  "etag": "status:1:1732201234567",
  "lastUpdated": "2025-11-21T15:00:00Z",
  "schemaVersion": 2
}
```

**Note:** Returns 404 if no `.track/track.db` exists in current directory.

**Token cost:** Variable based on project size (~360 tokens per track).

### `/mcp/track/version`
Get CLI + schema version (~40 tokens).

**Example response:**
```json
{
  "data": {
    "cli": "track-cli 0.1.0",
    "schema": 2
  },
  "lastUpdated": "2025-11-21T15:12:42.009Z",
  "schemaVersion": 2,
  "etag": "84632f552cd0"
}
```

### `/mcp/track/state`
Get current working directory (runtime) + default config path (~43 tokens).

**Example response:**
```json
{
  "data": {
    "cwd": "/Users/example/my-project",
    "defaultConfig": ".track/config.json"
  },
  "lastUpdated": "2025-11-21T15:12:42.009Z",
  "schemaVersion": 2,
  "etag": "774131bbbed6"
}
```

### `/mcp/track/recent-errors?limit=n`
Get newest log entries (best-effort, bounded to max 20).

**Example request:** `/mcp/track/recent-errors?limit=3`

**Example response:**
```json
{
  "data": {
    "errors": [
      {
        "timestamp": "2025-11-21T14:30:15.123Z",
        "message": "Track ABC123 not found"
      }
    ]
  },
  "lastUpdated": "2025-11-21T15:12:42.009Z",
  "schemaVersion": 2,
  "etag": "recent:1:2025-11-21T15:12:42.009Z"
}
```
**Note:** Returns empty array if log file is missing or unreadable.

## Token Cost Summary

| Endpoint | Size (tokens) | Use Case |
|----------|---------------|----------|
| `/quickstart` | ~400 | Essential commands + patterns |
| `/recipes` | ~300 | jq query patterns |
| `/version` | ~40 | CLI version check |
| `/state` | ~43 | Current directory |
| `/status` (small project) | ~1,100 | Live project data (3 tracks) |
| `/status` (medium project) | ~3,500 | Live project data (10 tracks) |
| **Static baseline** | **~783** | Total without project data |
| **Typical usage** | **~1,900** | Static + small project |

## Environment Variables
- `MCP_PORT` (default `8765`) — listening port.
- `MCP_HOST` (default `127.0.0.1`) — listening host.
- `MCP_ERRORS_FILE` (default `.track/mcp-errors.log`) — source log for recent-errors.

## Scripts
- `npm run mcp:sync` — regenerate metadata JSON envelopes and rebuild.
- `npm run mcp:start` — start compiled server from `dist`.
- `npm run mcp:dev` — dev compile watch (server not auto-run).

**Note:** `quickstart.json` and `recipes.json` are maintained as static files in `src/mcp/data/`.
`mcp:sync` only regenerates `version.json` and `state.json` from source.

## Starting via CLI

### Command

```bash
track mcp start [options]
```

Start the MCP server from the current directory. Requires a track project (`.track/track.db`) to exist.

### Options

- `-p, --port <port>` - Port to listen on (default: 8765)
- `-h, --host <host>` - Host to bind to (default: 127.0.0.1)

### Environment Variables

Command-line options take precedence over environment variables:

- `MCP_PORT` - Default port if not specified via --port
- `MCP_HOST` - Default host if not specified via --host
- `MCP_ERRORS_FILE` - Path to errors log file (default: `.track/mcp-errors.log`)

### Examples

```bash
# Start with defaults (localhost:8765)
track mcp start

# Custom port
track mcp start --port 8877

# Custom host (WARNING: security implications)
track mcp start --host 0.0.0.0

# Using environment variables
MCP_PORT=9000 track mcp start

# Stop server: Press Ctrl+C in the terminal
```

## Data Regeneration

Run `npm run mcp:sync` after:
- Bumping CLI version in `package.json`
- Changing schema version in `src/mcp/constants.ts`
- Updating static content in `src/mcp/data/quickstart.json` or `recipes.json`

## Size & Safety
- Payloads capped at 5 KB; server returns 500 if exceeded.
- recent-errors is best-effort: returns empty array if log missing or unreadable.
- `/status` reads database directly via TrackManager (CLI library interface, not raw SQLite).

## Security

**⚠️ Localhost-only by default**

The MCP server binds to `127.0.0.1` (localhost) by default for security. This prevents external network access.

**Warning:** If you set `MCP_HOST` to a non-localhost address (e.g., `0.0.0.0`), the server will be exposed to your network. The server will display a warning when this happens:

```
⚠️  WARNING: MCP server is binding to 0.0.0.0, which may expose it to external networks.
   For security, consider using 127.0.0.1 (localhost) unless you have a specific need.
```

**Best practices:**
- Keep `MCP_HOST=127.0.0.1` unless you have a specific requirement
- No authentication is provided by default (localhost-only assumed)
- Read-only for metadata; `/status` reads database but does not mutate
- Write operations (create/update tracks) remain CLI-only (maintains "opaque storage" principle)

## Troubleshooting

### Port already in use

**Error:** `EADDRINUSE: address already in use`

**Solution:** Either:
1. Stop the process using port 8765: `lsof -ti:8765 | xargs kill`
2. Use a different port: `MCP_PORT=8866 npm run mcp:start`

### Connection refused

**Error:** `curl: (7) Failed to connect to 127.0.0.1 port 8765`

**Solution:**
- Verify server is running: `ps aux | grep "node.*mcp"`
- Check server logs for startup errors
- Ensure firewall isn't blocking the port

### Status endpoint returns 404

**Error:** `{"error":"No track database found in current directory"}`

**Solution:**
- Ensure `.track/track.db` exists in the current working directory
- Run `track init` if project not initialized
- Check `cwd` from `/mcp/track/state` to verify server working directory

### Stale version or schema

**Problem:** `/version` endpoint returns old schema version or CLI version

**Solution:** Regenerate metadata:
```bash
npm run mcp:sync  # Regenerates version.json from package.json and constants
```

## Sample Usage

Start the server:
```bash
npm run mcp:start
```

Query endpoints:
```bash
# Get quickstart guide
curl -s http://127.0.0.1:8765/mcp/track/quickstart | jq .

# Get jq recipes
curl -s http://127.0.0.1:8765/mcp/track/recipes | jq .

# Get live project status
curl -s http://127.0.0.1:8765/mcp/track/status | jq .

# Filter in-progress tracks only
curl -s "http://127.0.0.1:8765/mcp/track/status?status=in_progress" | jq .

# Get recent errors (max 3)
curl -s "http://127.0.0.1:8765/mcp/track/recent-errors?limit=3" | jq .

# Check version
curl -s http://127.0.0.1:8765/mcp/track/version | jq .
```

Use custom port:
```bash
MCP_PORT=8877 npm run mcp:start &
curl -s http://127.0.0.1:8877/mcp/track/quickstart | jq .
```

## Integration with AI Agents

The `track mcp start` command is designed for integration with Claude Code, Codex, and other MCP-compatible AI coding assistants.

### Claude Code Setup

#### Method 1: Manual Configuration

Edit `~/.claude.json` (or `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "track-cli": {
      "command": "track",
      "args": ["mcp", "start"]
    }
  }
}
```

#### Method 2: Claude CLI (if available)

```bash
claude mcp add track-cli -s user -- track mcp start
```

#### Project-Scoped Configuration

For team sharing, create `.claude.json` in your project root:

```json
{
  "mcpServers": {
    "track-cli": {
      "command": "track",
      "args": ["mcp", "start"]
    }
  }
}
```

Commit to git so all team members benefit.

### Codex Setup

Edit `~/.codex/config.toml`:

```toml
[mcp.track-cli]
command = "track"
args = ["mcp", "start"]
```

Or use Codex CLI:

```bash
codex mcp add track-cli -- track mcp start
```

### Custom Port Configuration

If port 8765 is in use:

**Claude Code (JSON):**
```json
{
  "mcpServers": {
    "track-cli": {
      "command": "track",
      "args": ["mcp", "start", "--port", "8877"]
    }
  }
}
```

**Codex (TOML):**
```toml
[mcp.track-cli]
command = "track"
args = ["mcp", "start", "--port", "8877"]
```

### Testing the Connection

1. **Manual test:**
   ```bash
   # Start server
   cd your-project
   track mcp start

   # In another terminal
   curl http://127.0.0.1:8765/mcp/track/version | jq
   ```

2. **Via AI Agent:**
   Ask Claude Code or Codex:
   - "What's my track project status?"
   - "Show me the quickstart guide"
   - "What are the available track commands?"

### Troubleshooting Integration

#### Server Won't Start

**Error:** `No track project found in this directory`

**Solution:** Run `track init` first

---

**Error:** `Port already in use`

**Solution:** Use different port:
```bash
track mcp start --port 8877
```

#### Agent Can't Connect

1. Check server is running: `ps aux | grep "track mcp"`
2. Verify config file syntax (JSON/TOML)
3. Restart AI agent application
4. Check agent logs for MCP connection errors

#### Stale Data

**Problem:** Agent sees old track data

**Solution:** MCP server reads database on each request. Restart server if needed:
```bash
# Ctrl+C to stop
track mcp start
```
