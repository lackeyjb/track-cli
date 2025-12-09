# Command Reference

Quick reference for all Track CLI commands.

## Table of Contents

- [`track init`](#track-init) - Initialize project
- [`track new`](#track-new) - Create track
- [`track update`](#track-update) - Update track
- [`track status`](#track-status) - Display status
- [`track show`](#track-show) - Show track details
- [`track mcp start`](#track-mcp-start) - Start MCP server

## Global Options

Available for all commands:

- `--help`, `-h` - Display help for command
- `--version`, `-V` - Display version number

## `track init`

Initialize a new Track CLI project.

### Synopsis

```bash
track init [name] [options]
```

### Arguments

- `name` - Project name (optional)
  - If omitted, uses current directory name
  - Can contain spaces (quote if needed: `"My Project"`)

### Options

- `-F, --force` - Overwrite existing project
  - Removes `.track/` directory and recreates database
  - Use with caution - all existing tracks will be lost

### Examples

**Basic initialization:**
```bash
track init "My Web App"
```

**Use directory name:**
```bash
cd my-project
track init
# Uses "my-project" as project name
```

**Overwrite existing project:**
```bash
track init "My Web App" --force
```

### Output

**Success:**
```
✓ Project initialized: My Web App (abc12345)
  Database: /path/to/project/.track/track.db
```

**Error - already initialized:**
```
✗ Error: Project already initialized at /path/to/project/.track
  Use --force to overwrite
```

### What It Does

1. Creates `.track/` directory in current working directory
2. Creates `track.db` SQLite database with schema
3. Creates root track (the project) with:
   - Title from `name` argument or directory name
   - 8-character nanoid
   - Status: `planned`
   - `parent_id`: NULL (root has no parent)

### Notes

- Must be run from project root directory
- Creates `.track/` in current directory, not globally
- Each project has its own independent database
- Root track cannot be deleted (enforced by design)

---

## `track new`

Create a new track (feature or task).

### Synopsis

```bash
track new "<title>" [options]
```

### Arguments

- `title` - Track title (required)
  - Must be quoted if it contains spaces
  - No length limit

### Options

- `--parent <id>` - Parent track ID (optional)
  - If omitted, defaults to root track
  - Must be a valid track ID from your project
  - Creates parent-child relationship

- `--summary <text>` - Current state summary (optional)
  - What's been done or decided
  - Defaults to empty string `""`
  - Comprehensive summaries recommended (no history in v1)

- `--next <text>` - Next steps (optional)
  - What to do next on this track
  - Defaults to empty string `""`
  - Should be specific and actionable

- `--file <path>` - Associate file (optional, repeatable)
  - Can be specified multiple times
  - Relative or absolute paths
  - No validation that file exists
  - Example: `--file src/api.ts --file src/types.ts`

### Examples

**Minimal (defaults to root parent):**
```bash
track new "User Authentication"
```

**With parent (create task under feature):**
```bash
track new "Login Form" --parent abc12345
```

**With summary and next steps:**
```bash
track new "API Integration" \
  --summary "Need to integrate with payment provider" \
  --next "Review API documentation and get credentials"
```

**With file associations:**
```bash
track new "Refactor Database Layer" \
  --file src/db/connection.ts \
  --file src/db/queries.ts \
  --file src/db/migrations.ts
```

**Complete example:**
```bash
track new "Implement User Profile Page" \
  --parent def67890 \
  --summary "User story #123: As a user, I want to view and edit my profile" \
  --next "Design profile form layout and fields" \
  --file src/pages/Profile.tsx
```

### Output

**Success:**
```
✓ Track created: User Authentication (ghi11111)
  Parent: abc12345 (My Web App)
  Status: planned
  Files: 0
```

**Error - no project:**
```
✗ Error: No project initialized in /path/to/project
  Run: track init "Project Name"
```

**Error - invalid parent:**
```
✗ Error: Unknown parent track id: xyz99999
```

### What It Does

1. Validates project exists (has `.track/track.db`)
2. Validates parent ID exists (if provided)
3. Gets root track ID (if `--parent` omitted)
4. Generates 8-character nanoid for new track
5. Creates track in database with:
   - Given title
   - Parent ID (provided or root)
   - Summary (provided or `""`)
   - Next prompt (provided or `""`)
   - Status: `planned`
   - Timestamps: created_at and updated_at
6. Associates files (if provided) via `track_files` table

### Notes

- All new tracks default to `planned` status
- Use `track update` to change status later
- Omitting `--parent` defaults to root (not creating second root)
- Only one root track per project (enforced)
- Track kind (super/feature/task) is derived, not specified

---

## `track update`

Update an existing track's state.

### Synopsis

```bash
track update <track-id> [options]
```

### Arguments

- `track-id` - Track ID to update (required)
  - Must be a valid 8-character track ID
  - Can use unique prefix (e.g., `abc` if unique)

### Options

- `--summary <text>` - Updated summary (optional)
  - Replaces previous summary entirely
  - Be comprehensive (no history to reference)

- `--next <text>` - Updated next steps (optional)
  - Replaces previous next_prompt entirely
  - Should be specific and actionable

- `--status <value>` - Updated status (optional)
  - Defaults to `in_progress` if not specified
  - Valid values:
    - `planned` - Not started yet
    - `in_progress` - Currently working on it
    - `done` - Completed
    - `blocked` - Waiting on something
    - `superseded` - Replaced by different approach

- `--file <path>` - Add file association (optional, repeatable)
  - Can be specified multiple times
  - Idempotent: adding same file twice won't create duplicate
  - Appends to existing file associations (cannot remove)

### Examples

**Update status only:**
```bash
track update abc12345 --status in_progress
```

**Update summary and next steps:**
```bash
track update abc12345 \
  --summary "Login form component created with email/password fields and validation" \
  --next "Wire up authentication API call and handle errors"
```

**Add file associations:**
```bash
track update abc12345 \
  --file src/hooks/useAuth.ts \
  --file src/api/auth.ts
```

**Complete update:**
```bash
track update abc12345 \
  --summary "API integration complete. Auth endpoints working. Token refresh implemented. Error handling added." \
  --next "Add unit tests for authentication flow. Then integration tests." \
  --status in_progress \
  --file tests/auth.test.ts
```

**Mark as done:**
```bash
track update abc12345 \
  --summary "Feature complete and tested. PR #42 merged to main." \
  --next "None - moving to next feature" \
  --status done
```

**Mark as blocked:**
```bash
track update abc12345 \
  --summary "Implementation blocked - waiting for API credentials from ops team" \
  --next "Once creds received, configure Stripe SDK and test connection" \
  --status blocked
```

### Output

**Success:**
```
✓ Track updated: abc12345
  Status: in_progress
  Files: 2
```

**Error - no project:**
```
✗ Error: No project initialized in /path/to/project
  Run: track init "Project Name"
```

**Error - invalid track ID:**
```
✗ Error: Unknown track id: xyz99999
```

**Error - invalid status:**
```
✗ Error: Invalid status: "working"
  Valid statuses: planned, in_progress, done, blocked, superseded
```

### What It Does

1. Validates project exists
2. Validates track ID exists
3. Validates status value (if provided)
4. Updates track in database:
   - Summary (if provided)
   - Next prompt (if provided)
   - Status (provided or defaults to `in_progress`)
   - updated_at timestamp
5. Adds file associations (if provided)
   - Uses INSERT OR IGNORE for idempotency
   - No duplicates created

### Notes

- Updates replace previous values (not append)
- Files are appended (cannot remove in v1)
- Status defaults to `in_progress` if not specified
- All options are optional, but at least one should be provided
- Track kind may change if children are added/removed elsewhere

---

## `track status`

Display project tree with all tracks.

### Synopsis

```bash
track status [options]
```

### Options

- `--json` - Output JSON format (optional)
  - Machine-readable format
  - Includes all track data
  - Perfect for AI agents and scripts

### Examples

**Human-readable tree:**
```bash
track status
```

**JSON output:**
```bash
track status --json
```

**JSON with jq filtering:**
```bash
track status --json | jq '.tracks[] | select(.status == "in_progress")'
```

### Output

**Human-readable format:**
```
My Web App (abc12345) [in_progress]
├── User Authentication (def67890) [done]
│   ├── Login Form (ghi11111) [done]
│   │   Files: src/components/LoginForm.tsx, src/hooks/useLogin.ts
│   └── Logout Button (jkl22222) [done]
└── Dashboard (mno33333) [in_progress]
    └── Widget System (pqr44444) [planned]
        Files: src/components/Widget.tsx
```

**JSON format:**
```json
{
  "tracks": [
    {
      "id": "abc12345",
      "title": "My Web App",
      "parent_id": null,
      "summary": "E-commerce web application",
      "next_prompt": "Continue with dashboard features",
      "status": "in_progress",
      "kind": "super",
      "files": []
    },
    {
      "id": "def67890",
      "title": "User Authentication",
      "parent_id": "abc12345",
      "summary": "Login and logout complete, tested",
      "next_prompt": "None - feature complete",
      "status": "done",
      "kind": "feature",
      "files": []
    },
    {
      "id": "ghi11111",
      "title": "Login Form",
      "parent_id": "def67890",
      "summary": "Form component with validation",
      "next_prompt": "",
      "status": "done",
      "kind": "task",
      "files": [
        "src/components/LoginForm.tsx",
        "src/hooks/useLogin.ts"
      ]
    }
  ]
}
```

**Error - no project:**
```
✗ Error: No project initialized in /path/to/project
  Run: track init "Project Name"
```

### What It Does

1. Validates project exists
2. Retrieves all tracks from database
3. Retrieves all file associations
4. Builds hierarchical tree structure
5. Derives track kinds (super/feature/task)
6. Outputs in requested format:
   - **Human**: Tree with indentation, status, files
   - **JSON**: Complete track data with derived kinds

### Notes

- Human format shows hierarchy with indentation
- JSON format includes ALL tracks (no filtering in v1)
- Kinds are derived on-the-fly (not stored)
- File lists are shown per track
- Tree structure built from parent_id relationships

### JSON Schema

```typescript
{
  tracks: Array<{
    id: string              // 8-char nanoid
    title: string           // Track title
    parent_id: string|null  // Parent ID (null for root)
    summary: string         // Current state summary
    next_prompt: string     // Next steps
    status: "planned"|"in_progress"|"done"|"blocked"|"superseded"
    kind: "super"|"feature"|"task"  // Derived kind
    files: string[]         // Associated file paths
  }>
}
```

### Using JSON Output

**Find in-progress tracks:**
```bash
track status --json | jq '.tracks[] | select(.status == "in_progress")'
```

**Get track by ID:**
```bash
track status --json | jq '.tracks[] | select(.id == "abc12345")'
```

**List all files:**
```bash
track status --json | jq -r '.tracks[].files[]' | sort | uniq
```

**Count by status:**
```bash
track status --json | jq '[.tracks | group_by(.status)[] | {status: .[0].status, count: length}]'
```

**Find tasks (leaf nodes):**
```bash
track status --json | jq '.tracks[] | select(.kind == "task")'
```

---

## `track show`

Display details for a specific track.

### Synopsis

```bash
track show <track-id> [options]
```

### Arguments

- `track-id` - Track ID to display (required)
  - Must be a valid 8-character track ID

### Options

- `--json` - Output JSON format (optional)
  - Machine-readable format
  - Includes all track data
  - Perfect for AI agents and scripts

### Examples

**Human-readable format:**
```bash
track show abc12345
```

**JSON output:**
```bash
track show abc12345 --json
```

### Output

**Human-readable format:**
```
[task] abc12345 - Login Form
  summary: Form component created with validation
  next:    Wire up authentication API call
  status:  in_progress
  files:   src/components/LoginForm.tsx, src/hooks/useLogin.ts
```

**JSON format:**
```json
{
  "id": "abc12345",
  "title": "Login Form",
  "parent_id": "def67890",
  "summary": "Form component created with validation",
  "next_prompt": "Wire up authentication API call",
  "status": "in_progress",
  "kind": "task",
  "files": [
    "src/components/LoginForm.tsx",
    "src/hooks/useLogin.ts"
  ],
  "children": [],
  "created_at": "2025-01-15T10:00:00.000Z",
  "updated_at": "2025-01-15T14:30:00.000Z"
}
```

**Error - no project:**
```
Error: No track project found in this directory.
Run "track init" first to initialize a project.
```

**Error - track not found:**
```
Error: Unknown track id: xyz99999
```

### What It Does

1. Validates project exists
2. Retrieves all tracks from database
3. Retrieves all file associations
4. Builds hierarchical tree structure to derive kind
5. Finds the requested track by ID
6. Outputs in requested format:
   - **Human**: Track details with labels
   - **JSON**: Complete track data with all fields

### Notes

- Human format shows kind, ID, title, summary, next, status, and files
- JSON format includes ALL track fields
- Kinds are derived on-the-fly (not stored)
- Simpler than using `track status --json | jq '.tracks[] | select(.id == "...")'`

---

## `track mcp start`

Start the MCP server for AI agent integration.

### Synopsis

```bash
track mcp start [options]
```

### Options

- `-p, --port <port>` - Port to listen on (optional)
  - Default: `8765` (or `MCP_PORT` environment variable)
  - Must be between 1 and 65535

- `-h, --host <host>` - Host to bind to (optional)
  - Default: `127.0.0.1` (or `MCP_HOST` environment variable)
  - **Security warning:** Only bind to non-localhost addresses in trusted networks

### Examples

**Start with defaults:**
```bash
track mcp start
```

**Custom port:**
```bash
track mcp start --port 8877
```

**Custom host:**
```bash
track mcp start --host 0.0.0.0
```

**Using environment variables:**
```bash
MCP_PORT=9000 MCP_HOST=127.0.0.1 track mcp start
```

### Output

**Success:**
```
Starting MCP server...
Working directory: /path/to/project
Database: .track/track.db

MCP server listening on http://127.0.0.1:8765/mcp/track

Press Ctrl+C to stop the server.
```

**Error - no project:**
```
Error: No track project found in this directory.
Run "track init" first to initialize a project.

Note: The MCP server needs a .track/track.db to serve project data.
```

**Error - invalid port:**
```
Error: Invalid port: 99999
Port must be a number between 1 and 65535.
```

### What It Does

1. Validates project exists (has `.track/track.db`)
2. Parses port and host from options or environment variables
3. Starts HTTP server on specified port/host
4. Exposes MCP endpoints:
   - `/mcp/track/quickstart` - Command patterns and workflows
   - `/mcp/track/recipes` - jq query recipes
   - `/mcp/track/status` - Live project data (with filtering)
   - `/mcp/track/version` - CLI and schema version
   - `/mcp/track/state` - Working directory info
   - `/mcp/track/recent-errors` - Error log entries
5. Runs until stopped with Ctrl+C

### Notes

- Server reads database on each request (no caching)
- All endpoints are read-only (cannot create/update tracks via MCP)
- Write operations remain CLI-only (maintains "opaque storage" principle)
- Default host (`127.0.0.1`) is localhost-only for security
- Non-localhost binding shows security warning
- No authentication provided (assumes localhost-only or trusted network)

### Integration

Configure AI agents to use the MCP server:

**Claude Code (`~/.claude.json`):**
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

**Codex (`~/.codex/config.toml`):**
```toml
[mcp.track-cli]
command = "track"
args = ["mcp", "start"]
```

### Environment Variables

- `MCP_PORT` - Default port (default: `8765`)
- `MCP_HOST` - Default host (default: `127.0.0.1`)
- `MCP_ERRORS_FILE` - Errors log path (default: `.track/mcp-errors.log`)

Command-line options take precedence over environment variables.

### See Also

- [MCP Server Guide](mcp.md) - Complete endpoint reference and integration guide
- [AI Agent Integration](AGENTS.md) - Patterns for AI usage
- [Examples](../examples/ai-agent-usage.md) - AI agent workflow examples

---

## Common Error Messages

### "No project initialized"

**Error:**
```
✗ Error: No project initialized in /path/to/project
  Run: track init "Project Name"
```

**Cause:** No `.track/track.db` found in current directory.

**Solution:** Run `track init` to create a project.

### "Project already initialized"

**Error:**
```
✗ Error: Project already initialized at /path/to/project/.track
  Use --force to overwrite
```

**Cause:** `.track/` directory already exists.

**Solution:** Use `--force` flag if you want to start fresh (deletes all data).

### "Unknown track id"

**Error:**
```
✗ Error: Unknown track id: xyz99999
```

**Cause:** Track ID doesn't exist in database.

**Solution:** Check ID with `track status` and use correct ID.

### "Unknown parent track id"

**Error:**
```
✗ Error: Unknown parent track id: xyz99999
```

**Cause:** Parent ID doesn't exist when creating new track.

**Solution:** Check parent ID with `track status` and use correct ID.

### "Invalid status"

**Error:**
```
✗ Error: Invalid status: "working"
  Valid statuses: planned, in_progress, done, blocked, superseded
```

**Cause:** Provided status value is not one of the five valid values.

**Solution:** Use one of: `planned`, `in_progress`, `done`, `blocked`, `superseded`.

---

## Tips

### Track ID Shortcuts

You can use unique prefixes instead of full IDs:

```bash
# Full ID
track update abc12345 ...

# Prefix (if unique)
track update abc ...
```

**Note:** Currently v1 requires full IDs. Prefix matching planned for v2.

### Command Aliases

Speed up common commands with shell aliases:

```bash
alias t='track'
alias ts='track status'
alias tn='track new'
alias tu='track update'
```

### Multi-line Commands

Use backslash for readability:

```bash
track new "Complex Feature" \
  --parent abc12345 \
  --summary "Long summary text here" \
  --next "Detailed next steps" \
  --file src/file1.ts \
  --file src/file2.ts \
  --file src/file3.ts
```

### Environment Variables

No environment variables supported in v1. All configuration is per-project in `.track/`.

---

## See Also

- [Usage Guide](usage.md) - Detailed tutorials and workflows
- [AI Agent Integration](AGENTS.md) - Patterns for AI usage
- [Examples](../examples/) - Real-world examples
- [Installation](installation.md) - Setup instructions
