# Track CLI

> Minimal, AI-friendly CLI for tracking project progress across sessions

Track CLI is a lightweight command-line tool designed for AI agents and developers to maintain context across work sessions. It provides hierarchical task tracking with a stable JSON API, making it perfect for multi-agent collaboration and session resumption.

## Features

- **Hierarchical tracking**: Project → Features → Tasks
- **AI-friendly**: Stable JSON output for programmatic consumption
- **Multi-agent safe**: SQLite with WAL mode for concurrent access
- **Current-state focused**: No history tracking—comprehensive summaries instead
- **File associations**: Link files to tracks for context
- **Minimal API**: Just 4 commands to learn

## Quick Start

### Installation

```bash
# Clone and install
git clone <your-repo-url>
cd track-cli
npm install
npm run build

# Link globally (optional)
npm link
```

### Basic Usage

```bash
# Initialize a project
track init "My Web App"

# Create a feature
track new "User Authentication" \
  --summary "Implement login and logout functionality" \
  --next "Start with the login form component"

# Create a task under the feature
track new "Login Form" \
  --parent <feature-id> \
  --summary "Build email/password form with validation" \
  --next "Create LoginForm.tsx component" \
  --file src/components/LoginForm.tsx

# Update progress
track update <task-id> \
  --summary "Form component created, validation added" \
  --next "Wire up authentication API call" \
  --status in_progress \
  --file src/hooks/useLogin.ts

# View project status
track status

# Get JSON output for AI consumption
track status --json
```

## Commands

### `track init [name] [-F|--force]`

Initialize a new project with a root track.

```bash
track init "My Project"        # Create with custom name
track init                      # Use directory name
track init "My Project" --force # Overwrite existing project
```

**Options:**

- `name` - Project name (defaults to directory name)
- `-F, --force` - Overwrite existing `.track/` database

### `track new "<title>" [options]`

Create a new track (feature or task).

```bash
track new "User Auth"                    # Create under root
track new "Login Form" --parent abc12345 # Create under specific parent
track new "API Integration" \
  --summary "Connect to auth service" \
  --next "Review API documentation" \
  --file src/api/auth.ts
```

**Options:**

- `--parent <id>` - Parent track ID (defaults to root)
- `--summary <text>` - What's been done / current state
- `--next <text>` - What to do next
- `--file <path>` - Associate file(s) with track (can repeat)

### `track update <track-id> [options]`

Update an existing track's state.

```bash
track update abc12345 \
  --summary "Completed form validation, started API integration" \
  --next "Handle authentication errors" \
  --status in_progress
```

**Options:**

- `--summary <text>` - Updated summary
- `--next <text>` - Next steps
- `--status <value>` - Status: `planned`, `in_progress`, `done`, `blocked`, `superseded`
- `--file <path>` - Add file association(s) (can repeat)

**Default status:** `in_progress` if not specified

### `track status [--json]`

Display project tree with all tracks.

```bash
track status        # Human-readable tree format
track status --json # JSON output for AI agents
```

**Human Output Example:**

```
My Web App (abc12345) [in_progress]
├── User Authentication (def67890) [in_progress]
│   ├── Login Form (ghi11111) [done]
│   │   Files: src/components/LoginForm.tsx, src/hooks/useLogin.ts
│   └── Logout Button (jkl22222) [planned]
└── Dashboard (mno33333) [blocked]
```

**JSON Output:** Contains complete track data including IDs, status, summaries, next steps, file associations, and derived track kinds.

## Track Kinds

Tracks have a **derived kind** based on their position in the hierarchy:

- **super**: Root track (the project itself)
- **feature**: Has children but is not root
- **task**: Leaf node (no children)

Kinds are calculated dynamically—they're not stored in the database.

## Status Values

- `planned` - Not started yet
- `in_progress` - Currently working on it
- `done` - Completed
- `blocked` - Waiting on something else
- `superseded` - Replaced by different approach

## File Associations

Associate files with tracks to maintain context:

```bash
# During creation
track new "API Client" --file src/api/client.ts --file src/api/types.ts

# During updates
track update abc12345 --file src/api/auth.ts
```

File associations are **idempotent**—adding the same file twice won't create duplicates.

## AI Agent Usage

Track CLI is optimized for AI agents and LLMs working across sessions. Multiple integration methods available:

### 1. AGENTS.md Template

Copy `docs/AGENTS.md` to your project root for any AI agent to use:

```bash
# Copy to your project
cp track-cli/docs/AGENTS.md your-project/AGENTS.md

# AI agents automatically discover and use this file
```

**Includes:**

- Essential 3-step workflow (session start/during/end)
- Command quick reference
- JSON output structure
- The Breadcrumb Pattern for detailed next steps
- Multi-agent coordination

### 2. Claude Code Skill

For Claude Code users, install the personal skill for automatic, proactive usage:

```bash
# Copy skill files
mkdir -p ~/.claude/skills/track-cli
cp -r track-cli/docs/claude-skills/* ~/.claude/skills/track-cli/

# Claude automatically:
# - Checks status at session start
# - Creates tracks for new work
# - Updates progress during session
# - Saves comprehensive state at session end
```

See [docs/claude-code-setup.md](docs/claude-code-setup.md) for complete setup guide.

### 3. Function Calling / Tool Use

For LLM tool calling (OpenAI, Anthropic, etc.):

```json
// Tool definitions in docs/tools.json
{
  "name": "track_status",
  "description": "Get current project state...",
  "input_schema": { "type": "object", "properties": {...} }
}
```

**Resources:**

- `docs/schema.json` - JSON schema for `track status --json` output
- `docs/tools.json` - Function calling definitions for all commands

### 4. MCP Server (Claude Code, Codex, etc.)

For MCP-compatible AI assistants, start the built-in server:

```bash
# In your project directory
track mcp start

# Custom port
track mcp start --port 8877
```

**Configure Claude Code (`~/.claude.json`):**
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

**Configure Codex (`~/.codex/config.toml`):**
```toml
[mcp.track-cli]
command = "track"
args = ["mcp", "start"]
```

See [docs/mcp.md](docs/mcp.md) for complete MCP integration guide.

### Basic Session Pattern

```bash
# At session start - resume context
track status --json | jq '.tracks[] | select(.status == "in_progress")'

# During work - create and update
track new "Feature" --summary "Description" --next "First step"
track update <id> --summary "Progress made" --next "Next specific step"

# At session end - save state
track update <id> \
  --summary "COMPLETE summary of what exists, what works, what's left" \
  --next "SPECIFIC next step with file paths and context"
```

**Key Principle:** No history tracking means summaries must be comprehensive. Use the **Breadcrumb Pattern** for detailed, actionable next steps.

**Documentation:**

- [AGENTS.md](docs/AGENTS.md) - Concise AI agent guide (copy to your project)
- [Claude Code Setup](docs/claude-code-setup.md) - Personal skill installation
- [AI Agent Examples](examples/ai-agent-usage.md) - Complete workflow examples

## Documentation

- [Installation Guide](docs/installation.md) - Detailed setup instructions
- [Usage Guide](docs/usage.md) - Comprehensive tutorials and workflows
- [Command Reference](docs/commands.md) - Quick lookup for all commands
- [AI Agent Integration](docs/AGENTS.md) - Patterns for AI agent usage
- [Examples](examples/) - Real-world workflow examples

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test                 # Single run
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report

# Lint and format
npm run lint            # Check for issues
npm run lint:fix        # Auto-fix issues
npm run format          # Format code
npm run typecheck       # Type check without building
```

### Project Structure

```
track-cli/
├── src/
│   ├── commands/       # Command implementations
│   ├── storage/        # SQLite database layer
│   ├── models/         # TypeScript types and business logic
│   └── utils/          # Shared utilities
├── docs/               # User documentation
├── examples/           # Usage examples
└── CLAUDE.md           # Development principles
```

### Architecture

Track CLI follows a layered architecture with clean separation of concerns:

**Utils → Models → Storage → Commands**

- **Utils**: ID generation, timestamps, path resolution
- **Models**: TypeScript types, tree building, kind derivation
- **Storage**: SQLite operations (CRUD, queries)
- **Commands**: CLI command handlers


### Design Principles

- **KISS**: Keep it simple—favor straightforward solutions
- **YAGNI**: Don't add features until actually needed
- **SOLID**: Clean interfaces and single responsibilities

## Testing

- **106 automated tests** covering all layers
- **91.7% overall coverage** (100% on utils, models, storage)
- Vitest with isolated test databases
- Comprehensive validation of error paths and edge cases

## Why Track CLI?

### vs. Manual TODO.md

- Structured data with stable JSON API
- Multi-agent safe (SQLite with WAL mode)
- File associations for context
- Query by status, parent, etc.

### vs. GitHub Issues

- Works locally and offline
- No network latency
- Designed for AI agents, not humans
- Current state only (no noise from history)

### vs. Other Task Trackers

- Minimal API surface (4 commands)
- No interactive prompts (AI-friendly)
- Opaque storage prevents AI from bypassing CLI
- Multi-agent concurrency built-in

## License

MIT

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Credits

Built with:

- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite bindings
- [nanoid](https://github.com/ai/nanoid) - ID generation
