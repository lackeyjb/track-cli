# Repository Guidelines

## Project Structure & Module Organization

- Source: `src/` (ESM TS). Entry `src/index.ts`; commands `src/commands/`; helpers `src/utils/`; models `src/models/`; library API `src/lib/`; tests in `src/__tests__/` and command subfolders.
- Build output: `dist/` (never edit directly).
- Docs/examples: `README.md`, `docs/`, `examples/`, `coverage/`.

## Build, Test, and Development Commands

- `npm run build` — compile to `dist/` (run before manual CLI testing).
- `npm run dev` — watch + recompile.
- `npm run test` / `npm run test:watch` — Vitest CI/watch; `npm run test:coverage` for V8 coverage.
- `npm run lint` / `npm run lint:fix` — ESLint with TypeScript + Prettier.
- `npm run format` / `npm run format:check` — apply/check Prettier.
- `npm run typecheck` — `tsc --noEmit`.

## Coding Style & Naming Conventions

- TypeScript, ESM. Prefer explicit types; avoid `any` (lint-enforced). Allow unused params only when prefixed with `_`.
- Formatting: 2-space indent, `printWidth` 100, single quotes, semicolons, LF endings (`prettier.config.js`).
- File naming: lowercase with dashes for commands, `*.ts` for sources, `*.test.ts` for tests.
- Keep command modules small and side-effect free; share logic via `src/lib/` and `src/utils/`.

## Development Principles

- KISS & YAGNI: prefer simple solutions; build only what v1 needs.
- SOLID-minded: single responsibility, small interfaces, depend on abstractions.
- Constraints: 5 commands, 2 tables; current state only (no history in v1); keep storage/models/commands/utils separate.
- AI-friendly: stable JSON via `track status --json`; write comprehensive summaries and actionable next steps; use the CLI, not direct SQLite access.

## Testing Guidelines

- Framework: Vitest. Write unit tests beside code as `*.test.ts`.
- Aim for coverage on new logic (`npm run test:coverage`). Mock external I/O; prefer in-memory scenarios over touching real SQLite files unless necessary.
- Use JSON fixtures under tests to mirror CLI responses where useful.

## Commit & Pull Request Guidelines

- Follow the existing Conventional-Commit-style prefixes (`docs:`, `refactor:`, `fix:`). Keep subjects imperative and concise.
- PRs should include: clear summary, linked issue (if any), test results/commands run, and CLI output or screenshots when behavior changes.
- Keep changes scoped; avoid mixing refactors with feature work. Update docs/examples when changing commands or flags.

## Security & Configuration Tips

- State in `.track/` (SQLite WAL); never commit it.
- Node.js >=18. Avoid global state; prefer dependency injection for predictable tests.
