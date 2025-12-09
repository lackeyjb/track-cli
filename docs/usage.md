# Usage Guide

This comprehensive guide covers everything you need to know about using Track CLI effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Basic Workflows](#basic-workflows)
4. [Working with Hierarchies](#working-with-hierarchies)
5. [File Associations](#file-associations)
6. [Status Management](#status-management)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)
9. [Tips and Tricks](#tips-and-tricks)

## Getting Started

### Your First Project

Let's create a simple project to understand the basics:

```bash
# Navigate to your project directory
cd ~/projects/my-app

# Initialize Track CLI
track init "My Web App"
```

**Output:**
```
✓ Project initialized: My Web App (abc12345)
  Database: /Users/you/projects/my-app/.track/track.db
```

**What happened:**
- Created `.track/` directory
- Created `track.db` SQLite database
- Created root track (the project itself) with ID `abc12345`

### Create Your First Feature

```bash
track new "User Authentication" \
  --summary "Need to add login and logout" \
  --next "Start with login form component"
```

**Output:**
```
✓ Track created: User Authentication (def67890)
  Parent: abc12345 (My Web App)
  Status: planned
```

### Check Your Project Status

```bash
track status
```

**Output:**
```
My Web App (abc12345) [planned]
└── User Authentication (def67890) [planned]
```

### Update a Track

```bash
track update def67890 \
  --summary "Login form component created with email/password fields" \
  --next "Add form validation" \
  --status in_progress
```

**Output:**
```
✓ Track updated: def67890
  Status: in_progress
  Files: 0
```

## Core Concepts

### Hierarchical Structure

Track CLI organizes work in a three-level hierarchy:

```
Project (super)
├── Feature 1 (feature)
│   ├── Task A (task)
│   └── Task B (task)
└── Feature 2 (feature)
    └── Task C (task)
```

- **Super**: The root track (your project)
- **Feature**: A track with children but not root
- **Task**: A leaf track with no children

**Important:** Kinds are **derived** (calculated dynamically), not stored. They depend on parent/child relationships.

### Track IDs

Every track gets a unique 8-character ID using nanoid:

```
abc12345  ← Your project
def67890  ← A feature
ghi11111  ← A task
```

**Properties:**
- URL-safe characters (A-Za-z0-9_-)
- Short enough to type manually
- Unique within your project

**Using IDs:**
```bash
track update abc12345 ...    # Full ID
track update abc1 ...        # Prefix works if unique
```

### Current State Model

Track CLI focuses on **current state**, not history:

- ✅ Latest summary of what's done
- ✅ Next steps to take
- ✅ Current status
- ❌ No edit history
- ❌ No change log
- ❌ No timestamps for updates

**Implication:** Your `--summary` must be comprehensive because there's no history to reference.

### Multi-Agent Safety

Track CLI uses SQLite with WAL (Write-Ahead Logging) mode:

- Multiple agents can read concurrently
- Writes are serialized safely
- No data corruption from concurrent access

Perfect for AI agents working in parallel on different features.

## Basic Workflows

### Creating Features and Tasks

**Pattern:** Break work into features, then into tasks.

```bash
# Initialize
track init "E-commerce Site"

# Create features
track new "Product Catalog" \
  --summary "Display products with search and filters" \
  --next "Design product card component"

track new "Shopping Cart" \
  --summary "Add/remove items, persist cart" \
  --next "Create cart state management"

# Get feature IDs from status
track status
# Note the IDs: product-catalog-id, shopping-cart-id

# Create tasks under features
track new "Product Card Component" \
  --parent <product-catalog-id> \
  --summary "Card needs image, title, price, description" \
  --next "Create ProductCard.tsx"

track new "Search Component" \
  --parent <product-catalog-id> \
  --summary "Search bar with filters" \
  --next "Design search UI mockup"
```

### Updating Progress

**Pattern:** Update when starting work, making progress, or finishing.

```bash
# Starting work
track update <task-id> \
  --summary "Starting work on product card" \
  --next "Create basic component structure" \
  --status in_progress

# Making progress
track update <task-id> \
  --summary "Component structure done, added props interface" \
  --next "Implement image loading with fallback" \
  --status in_progress

# Finishing
track update <task-id> \
  --summary "Component complete with image, title, price. Responsive design. Tests added." \
  --next "None - component is production ready" \
  --status done
```

### Resuming Work After Break

**Pattern:** Read status, pick up where you left off.

```bash
# What am I working on?
track status

# What was I doing on this task?
track show <task-id>

# Or get JSON for programmatic parsing
track show <task-id> --json

# Read the summary and next_prompt
# Do the work...

# Update before finishing session
track update <task-id> \
  --summary "Updated summary with today's work" \
  --next "What to do tomorrow" \
  --status in_progress
```

## Working with Hierarchies

### Parent-Child Relationships

Every track except the root has a parent:

```bash
# Create feature (defaults to root as parent)
track new "User Auth"

# Create task under feature
track new "Login Form" --parent <feature-id>

# Create subtask (if you want deeper nesting)
track new "Email Validation" --parent <task-id>
```

**Parent Rules:**
1. Omitting `--parent` defaults to root track
2. Parent must exist (validated before creation)
3. Only one root track per project (enforced)

### Understanding Kinds

Kinds change as you add/remove children:

```bash
# Create feature
track new "API Integration"  # Kind: task (no children yet)

# Add a child
track new "Auth Endpoint" --parent <api-integration-id>

# Now "API Integration" kind: feature (has children)
```

**Kind Rules:**
1. **super**: `parent_id = NULL AND has children`
2. **feature**: `parent_id != NULL AND has children`
3. **task**: `has no children`

Check kinds with:
```bash
track status --json | jq '.tracks[] | {id, title, kind}'
```

### Viewing the Tree

Human format shows hierarchy:

```bash
track status
```

```
E-commerce Site (abc12345) [in_progress]
├── Product Catalog (def67890) [in_progress]
│   ├── Product Card (ghi11111) [done]
│   └── Search Component (jkl22222) [in_progress]
└── Shopping Cart (mno33333) [planned]
```

JSON format includes full data:

```bash
track status --json
```

```json
{
  "tracks": [
    {
      "id": "abc12345",
      "title": "E-commerce Site",
      "parent_id": null,
      "summary": "",
      "next_prompt": "",
      "status": "in_progress",
      "kind": "super",
      "files": []
    },
    {
      "id": "def67890",
      "title": "Product Catalog",
      "parent_id": "abc12345",
      "summary": "Working on product display",
      "next_prompt": "Add filtering",
      "status": "in_progress",
      "kind": "feature",
      "files": []
    }
  ]
}
```

## File Associations

Track which files are related to each track for context.

### Adding Files During Creation

```bash
track new "API Client" \
  --file src/api/client.ts \
  --file src/api/types.ts \
  --file src/api/auth.ts
```

### Adding Files During Updates

```bash
track update <task-id> \
  --summary "Added error handling and retry logic" \
  --next "Add request timeout configuration" \
  --file src/api/errors.ts \
  --file src/api/retry.ts
```

### Viewing File Associations

```bash
# Human format shows files under each track
track status
```

```
API Integration (abc12345) [in_progress]
└── API Client (def67890) [in_progress]
    Files: src/api/client.ts, src/api/types.ts, src/api/errors.ts
```

```bash
# JSON format includes files array
track status --json | jq '.tracks[] | {id, title, files}'
```

### File Association Properties

- **Idempotent**: Adding same file twice won't create duplicates
- **Relative paths**: Stored as provided (typically relative to project root)
- **No validation**: Track CLI doesn't check if files exist
- **Append-only**: Can't remove file associations in v1 (only add)

### Use Cases for File Associations

**1. Context for AI Agents:**
```bash
# Agent can see which files are relevant
track status --json | jq '.tracks[] | select(.status == "in_progress") | .files[]'
```

**2. Code Review:**
```bash
# Review all files associated with a feature
track status --json | jq '.tracks[] | select(.id == "<feature-id>") | .files[]' | xargs cat
```

**3. Git Integration:**
```bash
# Commit files associated with a track
track status --json | jq -r '.tracks[] | select(.id == "<task-id>") | .files[]' | xargs git add
```

## Status Management

### Status Values

Track CLI supports 5 status values:

- **planned**: Not started, queued for later
- **in_progress**: Currently being worked on
- **done**: Completed and working
- **blocked**: Can't proceed (waiting for something)
- **superseded**: Replaced by different approach

### Status Transitions

Common patterns:

```bash
# Starting work
planned → in_progress

# Completing work
in_progress → done

# Getting blocked
in_progress → blocked

# Unblocking
blocked → in_progress

# Abandoning approach
planned/in_progress → superseded
```

**No enforced workflow** - you can transition between any statuses.

### Using "blocked"

When a track is blocked, explain why in the summary:

```bash
track update <task-id> \
  --summary "Payment integration blocked - waiting for API credentials from ops team" \
  --next "Once credentials received, configure Stripe client" \
  --status blocked
```

Create a separate track to unblock:

```bash
track new "Get Stripe API Credentials" \
  --summary "Need production API keys from ops" \
  --next "Email ops@company.com with request" \
  --status in_progress
```

### Using "superseded"

Mark tracks that were replaced:

```bash
track update <old-approach-id> \
  --summary "REST API approach superseded by GraphQL decision" \
  --next "See new GraphQL implementation track: <new-track-id>" \
  --status superseded
```

### Querying by Status

```bash
# Find all in-progress work
track status --json | jq '.tracks[] | select(.status == "in_progress")'

# Count tasks by status
track status --json | jq '.tracks | group_by(.status) | map({status: .[0].status, count: length})'

# Find blocked tracks
track status --json | jq '.tracks[] | select(.status == "blocked") | {id, title, summary}'
```

## Best Practices

### Writing Good Summaries

**Good summary characteristics:**
- ✅ Comprehensive (no history to reference)
- ✅ Current state focused
- ✅ Includes what's done
- ✅ Notes any important context

**Examples:**

❌ **Bad:**
```
--summary "Made some changes"
```

✅ **Good:**
```
--summary "Created LoginForm component with email/password fields, validation using Formik, error display. Responsive layout implemented. Unit tests added with 90% coverage."
```

❌ **Bad:**
```
--summary "Updated API"
```

✅ **Good:**
```
--summary "Refactored API client to use axios interceptors for auth. Added retry logic (3 attempts with exponential backoff). Error handling improved with typed errors. Updated all endpoints to use new client."
```

### Writing Effective Next Prompts

**Good next_prompt characteristics:**
- ✅ Actionable - clear next step
- ✅ Specific - not vague
- ✅ Context-aware - builds on summary

**Examples:**

❌ **Bad:**
```
--next "Continue working"
```

✅ **Good:**
```
--next "Wire up LoginForm to authentication API. Handle success (redirect to dashboard) and error cases (display error message)."
```

❌ **Bad:**
```
--next "Fix bugs"
```

✅ **Good:**
```
--next "Fix TypeScript error in useAuth hook (line 45). Then test with invalid credentials to ensure error handling works."
```

### Organizing Your Hierarchy

**Keep it flat:**
- ✅ Project → Features → Tasks (3 levels)
- ⚠️ Avoid deeper nesting (harder to visualize)

**Granularity:**
- Features: 2-5 hours of work
- Tasks: 30 minutes to 2 hours

**Naming:**
- Clear, descriptive titles
- Consistent naming patterns
- Avoid abbreviations

### Regular Updates

**Update frequency:**
- ✅ When starting work on a track
- ✅ Before context switches (switching tasks)
- ✅ Before ending work session
- ✅ When completing a track
- ⚠️ Not every single code change

**Minimal updates:**
```bash
# Quick update with just progress
track update <task-id> \
  --summary "Form validation complete, starting API integration" \
  --next "Call login endpoint and handle response"
```

## Common Patterns

### Daily Standup Pattern

```bash
# Yesterday: What did I complete?
track status --json | jq '.tracks[] | select(.status == "done") | {id, title}'

# Today: What am I working on?
track status --json | jq '.tracks[] | select(.status == "in_progress") | {id, title, next_prompt}'

# Blockers: What's blocked?
track status --json | jq '.tracks[] | select(.status == "blocked") | {id, title, summary}'
```

### Sprint Planning Pattern

```bash
# Create features for user stories
track new "User Story 123: Profile Page" \
  --summary "As a user, I want to edit my profile" \
  --next "Design profile form layout"

# Break down into tasks
track new "Profile Form Component" --parent <story-id>
track new "Avatar Upload" --parent <story-id>
track new "Password Change" --parent <story-id>

# Mark all as planned
track status  # All default to 'planned'
```

### Code Review Pattern

```bash
# Before creating PR, update all related tracks
track update <feature-id> \
  --summary "Feature complete and tested" \
  --next "Code review, then merge" \
  --status done

# After PR merged, mark as done
track update <feature-id> \
  --summary "PR #42 merged to main" \
  --status done
```

### Session Notes Pattern

```bash
# At start of session
track update <task-id> \
  --summary "Previous summary..." \
  --next "Today: Implement error handling, add tests" \
  --status in_progress

# At end of session
track update <task-id> \
  --summary "Error handling added with custom error classes. Tests added for happy path and 3 error cases. Need to add edge case tests." \
  --next "Add tests for network timeout and rate limiting. Then refactor error messages for better UX."
```

## Tips and Tricks

### Using jq for Advanced Queries

Install jq: `brew install jq` (macOS) or `apt-get install jq` (Linux)

**Note:** For getting a single track by ID, `track show <id>` is simpler than using jq filters.

```bash
# Pretty print JSON
track status --json | jq .

# Get track by ID (use track show instead for single tracks)
track show abc12345 --json

# List all task titles
track status --json | jq -r '.tracks[] | select(.kind == "task") | .title'

# Find tracks with specific file
track status --json | jq '.tracks[] | select(.files[] | contains("src/api"))'

# Count tracks by kind
track status --json | jq '[.tracks | group_by(.kind)[] | {kind: .[0].kind, count: length}]'
```

### Shell Aliases

Add to your `.bashrc` or `.zshrc`:

```bash
alias t='track'
alias ts='track status'
alias tn='track new'
alias tu='track update'
alias tj='track status --json | jq'
```

Usage:
```bash
tn "My Feature"                    # Quick create
ts                                 # Quick status
tj '.tracks[] | select(.status == "in_progress")'  # Quick query
```

### Environment Variables

Set a project-specific track alias:

```bash
# In project directory
echo 'alias track="node /path/to/track-cli/dist/index.js"' >> .envrc
direnv allow  # If using direnv
```

### Git Integration

Add `.track/` to `.gitignore`:

```bash
echo ".track/" >> .gitignore
```

**Or** commit it for team collaboration:

```bash
# .gitignore - don't ignore .track/
# .track/

git add .track/track.db
git commit -m "Share track state with team"
```

### Quick Status Check

```bash
# Show only in-progress tracks
track status --json | jq -r '.tracks[] | select(.status == "in_progress") | "\(.id): \(.title)"'

# Show current work with next steps
track status --json | jq '.tracks[] | select(.status == "in_progress") | {title, next: .next_prompt}'
```

### Batch Operations

```bash
# Mark all planned tasks as in_progress (manual per-track)
for id in $(track status --json | jq -r '.tracks[] | select(.status == "planned") | .id'); do
  track update $id --status in_progress --summary "Starting work" --next "TBD"
done
```

### Finding Parent IDs

```bash
# Get root track ID
track status --json | jq -r '.tracks[] | select(.kind == "super") | .id'

# Get feature ID by title
track status --json | jq -r '.tracks[] | select(.title == "User Auth") | .id'

# List all features with IDs
track status --json | jq -r '.tracks[] | select(.kind == "feature") | "\(.id): \(.title)"'
```

## Next Steps

- See [Command Reference](commands.md) for detailed command documentation
- Check [AI Agent Integration](AGENTS.md) for AI-specific patterns
- Browse [Examples](../examples/) for complete workflow examples
