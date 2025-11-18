# Installation Guide

This guide covers installing and setting up Track CLI on your system.

## Prerequisites

Track CLI requires:

- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)

### Check Prerequisites

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show 8.0.0 or higher
```

If you need to install or update Node.js:
- Download from [nodejs.org](https://nodejs.org/)
- Or use a version manager like [nvm](https://github.com/nvm-sh/nvm)

## Installation Methods

### Method 1: Install from Source (Recommended)

This is the current installation method while Track CLI is not yet published to npm.

#### 1. Clone the repository

```bash
git clone <repository-url>
cd track-cli
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Build the project

```bash
npm run build
```

This compiles TypeScript source files from `src/` to JavaScript in `dist/`.

#### 4. Link globally (optional but recommended)

```bash
npm link
```

This makes the `track` command available globally in your terminal.

**Alternative:** Run directly without linking:
```bash
node ./dist/index.js <command>
```

### Method 2: Local Installation

If you prefer not to link globally, you can use Track CLI within a specific project:

```bash
# Clone and build as above
npm install
npm run build

# Add to your project's package.json scripts
{
  "scripts": {
    "track": "node ../track-cli/dist/index.js"
  }
}

# Use via npm
npm run track -- init "My Project"
```

## Verification

After installation, verify Track CLI works correctly:

```bash
track --version
# Should output: 0.1.0

track --help
# Should show available commands
```

## Directory Structure

Track CLI stores project data in a `.track/` directory within your project:

```
your-project/
├── .track/
│   └── track.db       # SQLite database
├── src/
└── ...
```

### Git Integration

If you're using git, you may want to add `.track/` to your `.gitignore`:

```bash
echo ".track/" >> .gitignore
```

**When to track `.track/`:**
- ✅ Single developer working alone
- ✅ Want to share project state with team

**When NOT to track `.track/`:**
- ✅ Multiple developers with independent work (recommended)
- ✅ Want clean diffs without database changes
- ✅ Using Track CLI for personal session notes

## Build Options

### Development Build with Watch Mode

For active development on Track CLI itself:

```bash
npm run dev
```

This watches for TypeScript changes and rebuilds automatically.

### Production Build

For a clean production build:

```bash
# Clean previous build
rm -rf dist/

# Build
npm run build
```

## Updating Track CLI

To update to the latest version:

```bash
cd track-cli
git pull
npm install  # Update dependencies if needed
npm run build
```

If you've globally linked Track CLI, the `track` command will automatically use the updated version.

## Troubleshooting

### "command not found: track"

**Cause:** Track CLI isn't globally linked or not in your PATH.

**Solutions:**
1. Run `npm link` in the track-cli directory
2. Or use the full path: `node /path/to/track-cli/dist/index.js`
3. Or add an alias: `alias track="node /path/to/track-cli/dist/index.js"`

### "Cannot find module" errors

**Cause:** Dependencies not installed or TypeScript not compiled.

**Solution:**
```bash
npm install
npm run build
```

### "better-sqlite3" compilation errors

**Cause:** Missing build tools for native modules.

**Solutions:**

**macOS:**
```bash
xcode-select --install
```

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential python3
```

**Windows:**
```bash
npm install --global windows-build-tools
```

### "Database is locked" errors

**Cause:** Another process has the database open.

**Solutions:**
1. Close any other Track CLI commands
2. Check for stuck processes: `ps aux | grep track`
3. If needed, delete `.track/track.db-shm` and `.track/track.db-wal` (only if no commands running)

### TypeScript errors during build

**Cause:** Incompatible TypeScript version or corrupted node_modules.

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Uninstallation

To remove Track CLI:

```bash
# If globally linked
npm unlink -g track-cli

# Remove the repository
rm -rf /path/to/track-cli
```

To remove Track CLI data from a project:

```bash
rm -rf .track/
```

## Next Steps

Now that Track CLI is installed:

1. Read the [Usage Guide](usage.md) for tutorials and workflows
2. Check the [Command Reference](commands.md) for quick lookups
3. See [Examples](../examples/) for real-world usage patterns

Or jump right in:

```bash
track init "My First Project"
track new "My First Feature"
track status
```
