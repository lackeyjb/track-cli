import { projectExists } from '../utils/paths.js';
import { startServer } from '../mcp/server.js';
import { DEFAULT_PORT, DEFAULT_HOST } from '../mcp/constants.js';

export interface McpStartOptions {
  port?: number;
  host?: string;
}

/**
 * Start the MCP server for AI agent integration.
 *
 * @param options - Command options (port, host)
 * @throws Error if project doesn't exist or server fails to start
 */
export function mcpStartCommand(options: McpStartOptions): void {
  // 1. Validate project exists
  if (!projectExists()) {
    console.error('Error: No track project found in this directory.');
    console.error('Run "track init" first to initialize a project.');
    console.error('\nNote: The MCP server needs a .track/track.db to serve project data.');
    process.exit(1);
  }

  // 2. Parse options (with env var fallback)
  const port =
    options.port ??
    (process.env.MCP_PORT ? Number.parseInt(process.env.MCP_PORT, 10) : DEFAULT_PORT);
  const host = options.host ?? process.env.MCP_HOST ?? DEFAULT_HOST;

  // 3. Validate port
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    console.error(`Error: Invalid port: ${options.port ?? process.env.MCP_PORT}`);
    console.error('Port must be a number between 1 and 65535.');
    process.exit(1);
  }

  try {
    // 4. Start server
    console.log('Starting MCP server...');
    console.log(`Working directory: ${process.cwd()}`);
    console.log(`Database: .track/track.db\n`);

    startServer(port, host);

    // Server logs its own "listening on..." message
    console.log('\nPress Ctrl+C to stop the server.\n');
  } catch (error) {
    console.error('Error: Failed to start MCP server.');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}
