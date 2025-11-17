# Development Principles

When working on this codebase, adhere to these core principles:

## KISS (Keep It Simple, Stupid)
- Favor simple, straightforward solutions over clever ones
- If a feature seems complex, question whether it's needed
- Clear code > clever code

## YAGNI (You Aren't Gonna Need It)
- Don't add functionality until it's actually needed
- v1 focuses on core features only 
- Resist the urge to build for hypothetical future requirements

## SOLID Principles
- **Single Responsibility**: Each module/function has one clear purpose
- **Open/Closed**: Design for extension without modification (e.g., storage interface could swap SQLite for other backends)
- **Liskov Substitution**: Maintain consistent interfaces
- **Interface Segregation**: Keep interfaces focused and minimal
- **Dependency Inversion**: Depend on abstractions (interfaces) not concrete implementations

## Project-Specific Guidelines

**Minimal & Pragmatic**
- This is a minimal CLI tool for AI agents
- 2 tables (tracks, track_files) - no more
- 4 commands (init, new, continue, status) - keep it focused
- Current state only (no history in v1)

**Extensible by Design**
- Clean separation: storage / models / commands / utils
- Well-defined interfaces enable future enhancements
- Can add history, analytics, search in v2 without breaking changes

**AI-Friendly**
- Stable JSON output for `track status --json`
- Comprehensive summaries (no history to rely on)
- Opaque storage (SQLite) enforces CLI usage

***REMOVED***
