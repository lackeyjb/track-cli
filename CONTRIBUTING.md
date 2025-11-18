# Contributing to Track CLI

Thank you for your interest in contributing to Track CLI! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Project Principles](#project-principles)

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git**

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/track-cli.git
cd track-cli
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/track-cli.git
```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

This compiles TypeScript files from `src/` to JavaScript in `dist/`.

### Link for Local Testing

```bash
npm link
```

Now you can use the `track` command globally with your local changes.

### Verify Setup

```bash
# Check version
track --version

# Run tests
npm test

# Check linting
npm run lint

# Check formatting
npm run format:check
```

## Development Workflow

### 1. Create a Branch

Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### 2. Make Changes

Follow the [Coding Standards](#coding-standards) and [Project Principles](#project-principles).

### 3. Test Your Changes

```bash
# Run tests in watch mode (during development)
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

**Coverage requirements:**

- Overall: >= 90%
- Utils/Models/Storage: >= 100%
- Commands: >= 80%

### 4. Lint and Format

```bash
# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

### 5. Commit Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add support for track filtering by status

- Add --status flag to track status command
- Update tests and documentation
- Closes #123"
```

**Commit message format:**

```
<type>: <short summary>

<optional body>

<optional footer>
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript

- **Strict mode enabled** - No `any` types without justification
- **Explicit types** - Function parameters and return types should be typed
- **Interfaces over types** - Use interfaces for object shapes

### Style Guide

Track CLI uses ESLint and Prettier for code quality and formatting:

```bash
# Check linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Auto-format code
npm run format
```

**Key style points:**

- 2-space indentation
- Single quotes for strings
- Semicolons required
- No trailing commas in single-line objects
- Trailing commas in multi-line objects

### File Organization

```
src/
├── commands/       # Command implementations
├── storage/        # Database operations
├── models/         # TypeScript types and business logic
└── utils/          # Shared utilities
```

**Naming conventions:**

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix)

### Error Handling

```typescript
// Good: Clear error messages
if (!projectExists()) {
  console.error('✗ Error: No project initialized');
  console.error('  Run: track init "Project Name"');
  process.exit(1);
}

// Bad: Generic errors
if (!projectExists()) {
  throw new Error('Project not found');
}
```

**Error message guidelines:**

- Start with `✗ Error:` prefix
- Include actionable guidance
- Use `process.exit(1)` for CLI errors
- Don't use `throw` for expected error cases

## Testing

### Test Structure

Track CLI uses Vitest for testing:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Test Files

- Place tests next to source files: `src/commands/__tests__/init.test.ts`
- Test helpers in: `src/__tests__/helpers/`
- One test file per source file

### What to Test

- ✅ All public functions and commands
- ✅ Error cases and validation
- ✅ Edge cases (empty strings, null, undefined)
- ✅ Database operations (use temp databases)
- ✅ File operations (use temp directories)
- ❌ Don't mock database - use real SQLite operations

### Running Tests

```bash
# Watch mode (development)
npm test

# Single run (CI)
npm run test:run

# With coverage
npm run test:coverage

# Specific file
npm test -- src/commands/__tests__/init.test.ts
```

### Coverage Requirements

All PRs must maintain or improve test coverage:

```bash
npm run test:coverage
```

**Minimum thresholds:**

- Statements: 90%
- Branches: 85%
- Functions: 100%
- Lines: 90%

## Submitting Changes

### Pull Request Process

1. **Update documentation** - Update docs if you changed behavior
2. **Add tests** - All new code must have tests
3. **Check coverage** - Run `npm run test:coverage`
4. **Lint and format** - Run `npm run lint:fix && npm run format`
5. **Update CHANGELOG** - Add entry under "Unreleased" section (if applicable)
6. **Create PR** - Use the PR template

### PR Title Format

```
<type>: <short description>
```

Examples:

- `feat: add --filter flag to status command`
- `fix: handle database locking on concurrent writes`
- `docs: improve AI agent integration guide`

### PR Description Template

```markdown
## Description

Brief description of the changes and why they're needed.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?

Describe the tests you ran and how to reproduce them.

## Checklist

- [ ] My code follows the project's coding standards
- [ ] I have added tests that prove my fix/feature works
- [ ] All new and existing tests pass
- [ ] I have updated the documentation accordingly
- [ ] My changes maintain or improve code coverage
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, a maintainer will merge your PR

**Review criteria:**

- Code quality and style
- Test coverage
- Documentation updates
- Adherence to project principles

## Project Principles

Track CLI follows these core principles (see [CLAUDE.md](CLAUDE.md)):

### KISS (Keep It Simple, Stupid)

- Favor simple, straightforward solutions
- Clear code > clever code
- If it seems complex, question if it's needed

**Example:**

```typescript
// Good: Simple and clear
function isValidStatus(status: string): boolean {
  return ['planned', 'in_progress', 'done', 'blocked', 'superseded'].includes(status);
}

// Bad: Over-engineered
class StatusValidator {
  private validStatuses: Map<string, boolean>;
  // ... 50 lines of code
}
```

### YAGNI (You Aren't Gonna Need It)

- Don't add functionality until it's needed
- v1 focuses on core features only
- Resist building for hypothetical future requirements

**What to avoid:**

- Generic abstractions "for future use"
- Features not in the spec
- Configuration options for every possibility

### SOLID Principles

- **Single Responsibility** - Each module has one clear purpose
- **Open/Closed** - Design for extension without modification
- **Liskov Substitution** - Maintain consistent interfaces
- **Interface Segregation** - Keep interfaces focused and minimal
- **Dependency Inversion** - Depend on abstractions, not concrete implementations

### Minimal & Pragmatic

- Track CLI is a minimal CLI tool for AI agents
- 2 tables (`tracks`, `track_files`) - no more
- 4 commands (`init`, `new`, `continue`, `status`) - keep focused
- Current state only (no history in v1)

**Before adding new features, ask:**

1. Is this in the spec?
2. Does this violate YAGNI?
3. Could we solve this with existing features?
4. Is this for v1 or v2?

## Questions?

- Open an issue for questions
- Tag maintainers with `@username`
- Join discussions in existing issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to Track CLI! 🎉
