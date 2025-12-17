---
name: track-sparc
description: Plan and execute complex projects using SPARC methodology with track-cli. Use when given a project plan/spec in markdown, when starting multi-phase development work, or when asked to break down and implement a large feature. Manages tracks, worktrees, and dependencies automatically.
allowed-tools: Read, Glob, Grep, Edit, Bash
---

# SPARC Project Planning with track-cli

This skill enables autonomous planning and execution of complex software projects using the SPARC methodology (Specification, Pseudocode, Architecture, Refinement, Completion) integrated with the `track` CLI for progress tracking.

## When to Use This Skill

- Given a markdown specification or plan file to implement
- Starting a multi-phase development project
- Breaking down a large feature into manageable tasks
- Coordinating work across git worktrees
- Adapting to specification changes mid-project

## Core Workflow

### 0. Check Existing Tracks First (CRITICAL)

**Before creating ANY new tracks**, always check for existing tracks:

```bash
track status --json
```

Look for:
- **Existing super tracks** with `status: "planned"` that match the work to be done
- **Existing feature tracks** that represent the specification for your task
- If a track already exists for the feature you're implementing, **use it as the parent** for sub-tasks

**IMPORTANT**: If there's already a super track or feature track that describes the work (e.g., "Auto-Refresh" with a summary describing the feature), add your implementation tasks as children of that track using `--parent <existing-id>`. Do NOT create a new parallel feature track.

### 1. Plan Ingestion

When given a specification file:

1. **Check existing tracks** with `track status --json`
2. **Read and analyze** the markdown specification
3. **Extract structure**:
   - Project title → super track (`track init`) **only if no project exists**
   - Major sections/phases → features (`track new` under root) **only if not already tracked**
   - Bullet points → tasks (`track new --parent <feature>`)
   - Dependency keywords → `--blocks` relationships

4. **Initialize tracking** (only if `.track/` doesn't exist):
   ```bash
   track init "Project Name"
   ```

5. **Create hierarchical tracks** with dependencies between phases

### 2. SPARC Execution Per Feature

For each major feature, create and execute these phases:

| Phase | Track Prefix | Purpose |
|-------|--------------|---------|
| **S**pecification | `Spec:` | Define requirements, acceptance criteria, edge cases |
| **P**seudocode | `Pseudocode:` | Design approach, outline algorithms |
| **A**rchitecture | `Architecture:` | File structure, interfaces, data flow |
| **R**efinement | `Implement:` | Write code, tests, iterate |
| **C**ompletion | `Complete:` | Verify acceptance criteria, finalize |

Each phase blocks the next via `--blocks` flag.

### 3. Worktree Management

For isolated feature development:

```bash
# Create worktree for feature
git worktree add ../project-feature-name feature-branch

# Work in worktree (track database is shared)
cd ../project-feature-name
track status  # Same project data

# Associate tasks with worktree
track update <task-id> --status in_progress
# Worktree auto-detected

# When complete
track update <task-id> --status done --worktree -
```

### 4. Adaptive Planning

When specifications change:

1. Check current state: `track status --json`
2. Identify affected features and tasks
3. Add/update tracks as needed
4. Use `--blocks` / `--unblocks` to adjust dependencies

## Key Commands Reference

```bash
# Initialize project
track init "Project Name"

# Create feature (under root)
track new "Feature Name" --summary "..." --next "..."

# Create task (under feature)
track new "Task Name" --parent <feature-id> --summary "..." --next "..."

# Create with dependency
track new "Phase 2" --blocks <phase1-id>

# Update progress
track update <id> --status in_progress --summary "Progress..." --next "Next step..."

# Mark complete (triggers dependency cascade)
track update <id> --status done

# View status
track status           # Human-readable
track status --json    # For parsing
track status --worktree  # Filter to current worktree
```

## Acceptance Criteria Pattern

Always define clear acceptance criteria for tasks:

```bash
track new "Implement auth" \
  --parent <feature-id> \
  --summary "Build authentication system" \
  --next "Acceptance: 1) Login works 2) Logout works 3) Session persists"
```

Mark done only when ALL criteria are verified.

## Example: Ingesting a Plan

**Input specification:**
```markdown
# Build User Dashboard

## Phase 1: API Layer
- User endpoint
- Preferences endpoint

## Phase 2: UI Components
Depends on API Layer.
- Dashboard layout
- Settings panel
```

**Resulting commands:**
```bash
track init "Build User Dashboard"

# Phase 1
track new "Phase 1: API Layer" --summary "Backend endpoints" --next "Start with user endpoint"
# → abc123

track new "User endpoint" --parent abc123 --summary "GET/PUT /user" --next "Define schema"
track new "Preferences endpoint" --parent abc123 --summary "GET/PUT /prefs" --next "Define schema"

# Phase 2 (blocked by Phase 1)
track new "Phase 2: UI Components" --summary "Frontend components" --next "Wait for API" --blocks abc123
# → def456

track new "Dashboard layout" --parent def456 --summary "Main layout" --next "Create component"
track new "Settings panel" --parent def456 --summary "User settings UI" --next "Create component"
```

## Companion Subagents

This skill is loaded by specialized subagents in `.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `sparc-planner` | Design track hierarchies | Given a spec to break down |
| `sparc-executor` | Execute SPARC phases | Creating tracks, implementing features |
| `track-manager` | Monitor and manage | Progress checks, spec changes |

**Invoke explicitly:**
```
> Use sparc-planner to analyze this specification
> Use sparc-executor to create tracks from that plan
> Use track-manager to show project progress
```

See [.claude/agents/USING_TRACK_AGENTS.md](../../agents/USING_TRACK_AGENTS.md) for detailed usage.

## Supporting Documentation

- [WORKFLOW.md](WORKFLOW.md) - Detailed SPARC execution steps
- [TRACK-REFERENCE.md](TRACK-REFERENCE.md) - Complete CLI reference
- [TEMPLATES.md](TEMPLATES.md) - Plan parsing patterns
