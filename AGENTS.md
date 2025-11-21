# Repository Guidelines

## Project Structure & Module Organization

- Source lives in `src/` (ESM TypeScript). Entry point is `src/index.ts`; CLI commands sit in `src/commands/`; shared helpers in `src/utils/`; data models in `src/models/`; reusable API surface in `src/lib/`. Tests are colocated under `src/__tests__/` and `src/commands/__tests__/`.
- Built output goes to `dist/` (keep changes in `src/`; never hand-edit `dist/`).
- Docs and examples: `README.md` for usage, `docs/` for deeper notes, `examples/` for sample commands, `coverage/` from test runs.

## Build, Test, and Development Commands

- `npm run build` — compile TypeScript to `dist/`.
- `npm run dev` — watch + recompile on change.
- `npm run test` / `npm run test:watch` — run Vitest in CI/watch modes; `npm run test:coverage` for V8 coverage.
- `npm run lint` / `npm run lint:fix` — ESLint with TypeScript, Prettier integration.
- `npm run format` / `npm run format:check` — apply/check Prettier formatting.
- `npm run typecheck` — TypeScript with `noEmit` for strict typing.

## Coding Style & Naming Conventions

- TypeScript, ESM. Prefer explicit types; avoid `any` (lint-enforced). Allow unused params only when prefixed with `_`.
- Formatting: 2-space indent, `printWidth` 100, single quotes, semicolons, LF endings (see `prettier.config.js`).
- File naming: lowercase with dashes for commands, `*.ts` for sources, `*.test.ts` for tests.
- Keep command modules small and side-effect free; share logic via `src/lib/` and `src/utils/`.

## Testing Guidelines

- Framework: Vitest. Write unit tests beside code as `*.test.ts`.
- Aim for coverage on new logic (`npm run test:coverage`). Mock external I/O; prefer in-memory scenarios over touching real SQLite files unless necessary.
- Use JSON fixtures under tests to mirror CLI responses where useful.

## Commit & Pull Request Guidelines

- Follow the existing Conventional-Commit-style prefixes (`docs:`, `refactor:`, `fix:`). Keep subjects imperative and concise.
- PRs should include: clear summary, linked issue (if any), test results/commands run, and CLI output or screenshots when behavior changes.
- Keep changes scoped; avoid mixing refactors with feature work. Update docs/examples when changing commands or flags.

## Security & Configuration Tips

- The CLI stores state in `.track/` (SQLite with WAL). Treat it as user data; avoid committing it.
- Node.js >=18 required. Avoid adding global state; prefer dependency injection for command handlers to keep tests predictable.
