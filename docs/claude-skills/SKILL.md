---
name: track-cli
description: Use track CLI to maintain project progress context across sessions. PROACTIVELY check status at session start, create tracks for new work, and update tracks with progress. Essential for resuming work and multi-agent collaboration. Automatically invoked when starting work, creating features/tasks, or ending sessions.
allowed-tools: Bash, Read, Grep
---

# Track CLI - Project Progress Tracking

## When to Use This Skill (PROACTIVE)

**Automatically invoke at:**
- ✅ **Session start** - ALWAYS run `track status --json` to resume context
- ✅ **Creating new work** - Use `track new` to organize features and tasks
- ✅ **During work** - Update tracks regularly with progress
- ✅ **Session end** - ALWAYS update in-progress tracks before finishing

**Use track-cli when:**
- User starts working in a project directory
- User asks to create a feature or task
- User completes work and needs to save progress
- Multiple agents need to coordinate on same project

## Core Workflow

### 1. Session Start (ALWAYS DO THIS FIRST)

```bash
track status --json
```

**Parse the JSON to:**
- Find tracks with status `in_progress`, `planned`, or `blocked`
- Read `summary` - what's been done
- Read `next_prompt` - what to do next
- Check `files` array - which files to examine
- Understand hierarchy via `kind` (super/feature/task)

**Then inform user:**
- What work is in progress
- What the next steps are
- Offer to resume or start new work

### 2. During Work - Create Tracks

When user describes new work, create tracks:

```bash
# Create feature
track new "Feature Name" \
  --summary "Initial description or plan" \
  --next "First concrete step to take"

# Create task under feature (use returned ID as --parent)
track new "Task Name" \
  --parent <feature-id> \
  --next "Specific implementation step" \
  --file src/relevant/file.ts
```

### 3. During Work - Update Progress

Regularly update tracks as work progresses:

```bash
track update <track-id> \
  --summary "Comprehensive summary of what was accomplished. Include key decisions, what works, what's tested, blockers encountered." \
  --next "Clear, specific next step with file paths and line numbers if relevant" \
  --status in_progress \
  --file src/new/file.ts
```

### 4. Session End (ALWAYS DO THIS)

Before user ends session, update all in-progress tracks:

```bash
# Get in-progress tracks
track status --json | jq '.tracks[] | select(.status == "in_progress")'

# Update each one
track update <track-id> \
  --summary "COMPLETE summary - what exists, what works, what's left" \
  --next "SPECIFIC next step for resuming - include file paths, context" \
  --status in_progress
```

## Commands Quick Reference

| Command | Usage | Key Flags |
|---------|-------|-----------|
| `track init` | Initialize project (first time only) | `--force` to overwrite |
| `track new "<title>"` | Create track | `--parent <id>` `--summary <text>` `--next <text>` `--file <path>` |
| `track update <id>` | Update track | `--summary <text>` `--next <text>` `--status <status>` `--file <path>` |
| `track status` | View all tracks | `--json` for parsing |

## Status Values

- `planned` - Not started (default for new tracks)
- `in_progress` - Actively working (default for updates)
- `done` - Completed
- `blocked` - Waiting on dependency
- `superseded` - Abandoned approach

## The Breadcrumb Pattern (CRITICAL)

Always leave detailed breadcrumbs in `next_prompt`:

**Bad:**
```bash
--next "Continue with authentication"
```

**Good:**
```bash
--next "Wire up LoginForm component (src/components/LoginForm.tsx lines 45-67) to authAPI.login() in src/api/auth.ts. On success: redirect to /dashboard. On error: display error.message in FormError component. Add loading spinner during API call."
```

**Principles:**
- Specific file paths and line numbers
- Sequential steps (First X, then Y, then Z)
- Include context and reasoning
- Reference similar patterns

## Key Principles

**DO:**
- Run `track status --json` at EVERY session start (parse programmatically)
- Provide comprehensive summaries (no history in v1)
- Make `next_prompt` specific and actionable (use breadcrumbs)
- Update tracks regularly during work
- Associate files with `--file`
- Always update before session end

**DON'T:**
- Skip checking status at session start
- Use vague summaries ("made progress", "fixed bug")
- Use vague next steps ("continue working", "finish feature")
- Forget to update before ending session
- Try to remove files (not supported)

## Example Session

```bash
# Session start
track status --json
# Parse: found track abc12345 "Login Form" - status: in_progress
#        next_prompt: "Add validation to form fields"

# Work on it
# ... make changes to files ...

# Update progress
track update abc12345 \
  --summary "Form validation complete. Added email format check and password length validation. All validation errors display below respective fields." \
  --next "Wire up form submission to call authAPI.login(). Handle success (redirect /dashboard) and error (show message) cases." \
  --file src/components/LoginForm.tsx \
  --file src/hooks/useFormValidation.ts

# Session end
track status --json  # Verify state saved
```

## Multi-Agent Coordination

- `in_progress` status claims work for an agent
- Keep summaries current for handoffs
- Check `track status` before starting new work
- SQLite WAL mode handles concurrent writes safely

## Common Queries

```bash
# Find work to do
track status --json | jq '.tracks[] | select(.status == "in_progress" or .status == "planned")'

# Get specific track
track status --json | jq '.tracks[] | select(.id == "abc12345")'

# Find all tasks
track status --json | jq '.tracks[] | select(.kind == "task")'
```

## Error Handling

**No project found:**
```bash
# Initialize if needed
track init "Project Name"
```

**Unknown track ID:**
```bash
# Check available tracks
track status --json | jq '.tracks[] | {id, title}'
```

## For More Information

See detailed reference files (loaded on demand):
- `reference.md` - Complete command details
- `workflows.md` - Common patterns and scenarios
- `schema.json` - JSON output schema
