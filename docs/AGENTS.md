# Track CLI - AI Agent Guide

Copy this file to your project root as `AGENTS.md`. Purpose: keep agents aligned across sessions using Track CLI’s hierarchical tracking.

## Quick Setup

- Requirements: Node >=18. Install and build once: `npm install && npm run build` (optional: `npm link` to use `track` globally).
- State lives in `.track/` (SQLite WAL). Do not commit it. `track init` creates it; `--force` wipes it.

## Core Workflow

- Start session: `track status --json` → pick items with `in_progress`, `planned`, or `blocked`; read `summary` and `next_prompt`.
- During work: create leaves with `track new "<title>" --parent <id> --summary "<state>" --next "<action>" --file <path>`. Update any item with `track update <id> ...` (defaults `status` to `in_progress` unless overridden).
- End session: run `track update` with a concise summary of work done and an actionable `--next`.

## Command Cheatsheet (when to use)

- `track init [name]` — once per repo (or to reset with `--force`).
- `track new "<title>"` — add feature/task; omit `--parent` to attach to root.
- `track update <id>` — any update (status, summary, next, files).
- `track status --json` — always use JSON for parsing/selection.

## Status & JSON Contract

- Status lifecycle: `planned` → `in_progress` → `done`/`blocked`/`superseded`. Claim work by setting `in_progress`; unblock/finish explicitly.
- JSON is stable for: `id` (8-char nanoid), `title`, `parent_id` (null for root), `summary`, `next_prompt`, `status`, `files[]`, `children[]`, `created_at`, `updated_at`. `kind` is derived (`super` | `feature` | `task`); ordering is not guaranteed; tolerate extra fields.

## Breadcrumb Template (use in `--next`)

`<file>: do <step1>; then <step2>. Acceptance: <observable result>. Context: <why this approach>.`

Example: `--next "src/commands/continue.ts: add validation before DB write; then update tests in src/commands/__tests__/continue.test.ts. Acceptance: continue rejects empty summary."`

## Multi-Agent Rules

- Before working: `track status --json` to avoid collisions; mark `in_progress` to claim.
- Don’t overwrite others’ summaries; prefer adding child tasks over editing someone else’s node.
- Keep updates frequent; summaries should be current state (not history), `next_prompt` must be immediately actionable.
