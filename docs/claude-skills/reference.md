# Track CLI - Command Reference

Detailed command documentation for track CLI. Load this when you need specifics about flags, behavior, or edge cases.

## `track init [name] [--force]`

**Purpose:** Initialize new track project in current directory.

**Arguments:**
- `name` (optional) - Project name (defaults to directory name)

**Flags:**
- `--force`, `-F` - Overwrite existing project (DESTROYS all data)

**Behavior:**
1. Creates `.track/` directory in cwd
2. Creates `track.db` SQLite database
3. Creates root track with 8-char nanoid
4. Sets root status to `planned`

**Output:**
```
✓ Project initialized: My Web App (abc12345)
  Database: /path/to/project/.track/track.db
```

**Errors:**
- "Project already initialized" - use `--force`
- Permission denied - check directory permissions

**Examples:**
```bash
track init                      # Use directory name
track init "My Web App"         # Custom name
track init "My App" --force     # Overwrite existing
```

---

## `track new "<title>" [options]`

**Purpose:** Create new track (feature or task).

**Arguments:**
- `title` (required) - Track title (quote if spaces)

**Flags:**
- `--parent <id>` - Parent track ID (defaults to root)
- `--summary <text>` - Current state summary (defaults to `""`)
- `--next <text>` - Next steps (defaults to `""`)
- `--file <path>` - Associate file (repeatable)

**Behavior:**
1. Validates project exists
2. Validates parent ID (if provided)
3. Generates unique 8-char nanoid
4. Creates track with status `planned`
5. Associates files (if provided)
6. Sets created_at and updated_at timestamps

**Output:**
```
✓ Track created: User Authentication (ghi11111)
  Parent: abc12345 (My Web App)
  Status: planned
  Files: 0
```

**Errors:**
- "No project initialized" - run `track init`
- "Unknown parent track id" - verify ID from `track status --json`

**Examples:**
```bash
# Minimal
track new "User Authentication"

# With parent
track new "Login Form" --parent abc12345

# Complete
track new "API Integration" \
  --parent def67890 \
  --summary "Need Stripe integration for payments" \
  --next "Review Stripe API docs, get test credentials" \
  --file src/api/payment.ts \
  --file src/types/payment.ts
```

**Notes:**
- All new tracks default to `planned` status
- Kind (super/feature/task) is derived, not specified
- Omitting `--parent` defaults to root (not creating second root)
- Files are not validated (don't need to exist)

---

## `track update <track-id> [options]`

**Purpose:** Update existing track's state.

**Arguments:**
- `track-id` (required) - 8-character track ID

**Flags:**
- `--summary <text>` - Updated summary (replaces previous)
- `--next <text>` - Updated next steps (replaces previous)
- `--status <value>` - Lifecycle status (defaults to `in_progress`)
  - Values: `planned`, `in_progress`, `done`, `blocked`, `superseded`
- `--file <path>` - Add file association (repeatable, idempotent)

**Behavior:**
1. Validates project and track ID exist
2. Validates status value (if provided)
3. Updates provided fields only
4. Defaults status to `in_progress` if not specified
5. Adds files (INSERT OR IGNORE - no duplicates)
6. Updates updated_at timestamp

**Output:**
```
✓ Track updated: abc12345
  Status: in_progress
  Files: 3
```

**Errors:**
- "No project initialized" - run `track init`
- "Unknown track id" - verify from `track status --json`
- "Invalid status" - use one of 5 valid values

**Examples:**
```bash
# Update status only
track update abc12345 --status in_progress

# Save progress
track update abc12345 \
  --summary "Login form complete. Email/password fields with validation. API integration done. Error handling implemented." \
  --next "Add loading states during API call. Then implement 'remember me' checkbox."

# Mark as done
track update abc12345 \
  --summary "Feature complete. All tests passing. PR #42 merged." \
  --next "None - feature complete" \
  --status done

# Mark as blocked
track update abc12345 \
  --summary "Blocked - waiting for API credentials from ops (ticket #789)" \
  --next "Once creds received: configure SDK, test connection" \
  --status blocked

# Add files
track update abc12345 \
  --file src/hooks/useAuth.ts \
  --file tests/auth.test.ts
```

**Notes:**
- Summary and next_prompt REPLACE previous values (not append)
- Files APPEND to existing associations
- Cannot remove files in v1
- Status defaults to `in_progress` if not specified
- All options are optional, but provide at least one

---

## `track status [--json]`

**Purpose:** Display current project state with all tracks.

**Flags:**
- `--json` - Output structured JSON (use for programmatic parsing)

**Behavior:**
1. Validates project exists
2. Retrieves all tracks from database
3. Retrieves all file associations
4. Builds hierarchical tree structure
5. Derives track kinds (super/feature/task)
6. Outputs in requested format

**Human Output:**
```
Project: My Web App (abc12345)

[super] abc12345 - My Web App
  summary: E-commerce web application
  next:    Continue with dashboard features
  status:  in_progress

  [feature] def67890 - User Authentication
    summary: Login and logout complete
    next:    None - feature complete
    status:  done
```

**JSON Output:**
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
      "files": [],
      "children": ["def67890"],
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T14:30:00.000Z"
    }
  ]
}
```

**Errors:**
- "No project initialized" - run `track init`

**Common Queries:**
```bash
# Find in-progress work
track status --json | jq '.tracks[] | select(.status == "in_progress")'

# Find planned work
track status --json | jq '.tracks[] | select(.status == "planned")'

# Get track by ID (use track show instead for single tracks)
track show abc12345 --json

# List all files
track status --json | jq -r '.tracks[].files[]' | sort | uniq

# Count by status
track status --json | jq '[.tracks | group_by(.status)[] | {status: .[0].status, count: length}]'

# Find tasks only
track status --json | jq '.tracks[] | select(.kind == "task")'

# Get root project
track status --json | jq '.tracks[] | select(.parent_id == null)'
```

**Notes:**
- Human format shows tree with indentation
- JSON format includes ALL tracks
- Kinds are derived on-the-fly (not stored)
- Tree structure built from parent_id relationships

---

## `track show <track-id> [--json]`

**Purpose:** Display details for a specific track.

**Arguments:**
- `track-id` (required) - 8-character track ID

**Flags:**
- `--json` - Output as JSON

**Behavior:**
1. Validates project exists
2. Retrieves all tracks and file associations
3. Builds tree to derive kind and children
4. Finds requested track by ID
5. Outputs in requested format

**Human Output:**
```
[task] abc12345 - Login Form
  summary: Form component created with validation
  next:    Wire up authentication API call
  status:  in_progress
  files:   src/components/LoginForm.tsx, src/hooks/useLogin.ts
```

**JSON Output:**
```json
{
  "id": "abc12345",
  "title": "Login Form",
  "parent_id": "def67890",
  "summary": "Form component created with validation",
  "next_prompt": "Wire up authentication API call",
  "status": "in_progress",
  "kind": "task",
  "files": ["src/components/LoginForm.tsx", "src/hooks/useLogin.ts"],
  "children": [],
  "created_at": "2025-01-15T10:00:00.000Z",
  "updated_at": "2025-01-15T14:30:00.000Z"
}
```

**Errors:**
- "No project initialized" - run `track init`
- "Unknown track id" - verify ID from `track status --json`

**Examples:**
```bash
track show abc12345
track show abc12345 --json
```

**Notes:**
- Simpler than `track status --json | jq '.tracks[] | select(.id == "...")'`
- Returns single track object, not wrapped in `tracks` array
- Includes all derived fields (kind, children)

---

## JSON Schema Details

**Track Object:**
```typescript
{
  id: string                  // 8-char nanoid (e.g., "abc12345")
  title: string               // Track title
  parent_id: string | null    // Parent ID or null for root
  summary: string             // Current state summary
  next_prompt: string         // Next steps
  status: Status              // Lifecycle status
  kind: Kind                  // Derived kind
  files: string[]             // Associated file paths
  children: string[]          // Child track IDs
  created_at: string          // ISO 8601 UTC timestamp
  updated_at: string          // ISO 8601 UTC timestamp
}
```

**Types:**
```typescript
type Status = 'planned' | 'in_progress' | 'done' | 'blocked' | 'superseded'
type Kind = 'super' | 'feature' | 'task'
```

**Kind Derivation:**
- `super`: parent_id is null OR has grandchildren
- `feature`: has children but no grandchildren
- `task`: has no children (leaf node)

---

## Technical Details

**Database:**
- Location: `.track/track.db` (current directory)
- Format: SQLite 3 with WAL mode
- Tables: `tracks`, `track_files`
- Concurrency: Safe (WAL + busy timeout 5s)

**Track IDs:**
- Format: 8-character nanoid
- Character set: `A-Za-z0-9_-`
- Collision probability: ~1 in 3 trillion for 100k tracks

**Timestamps:**
- Format: ISO 8601 UTC
- Example: `2025-01-15T14:30:00.000Z`
- Auto-updated on `track update`

**File Associations:**
- No validation (files don't need to exist)
- Can be relative or absolute paths
- Idempotent (can't add duplicates)
- Cannot remove in v1 (append only)

---

## Common Errors

**"No track project found"**
```
Error: No track project found in this directory.
Run "track init" first to initialize a project.
```
Solution: Run `track init [name]`

**"Unknown track id"**
```
Error: Unknown track id: xyz99999
```
Solution: Verify ID from `track status --json`

**"Unknown parent track id"**
```
Error: Unknown parent track id: xyz99999
```
Solution: Verify parent ID from `track status --json`

**"Invalid status"**
```
Error: Invalid status: "working"
Valid statuses: planned, in_progress, done, blocked, superseded
```
Solution: Use one of the 5 valid status values

**"Project already initialized"**
```
Error: Project already initialized at /path/.track
Use --force to overwrite
```
Solution: Use `--force` to overwrite or work with existing project
