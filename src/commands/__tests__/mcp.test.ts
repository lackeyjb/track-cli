import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mcpStartCommand } from '../mcp.js';
import { initCommand } from '../init.js';
import { withTempDir } from '../../__tests__/helpers/test-fs.js';
import { mockConsole, mockProcessExit } from '../../__tests__/helpers/mocks.js';
import * as server from '../../mcp/server.js';

describe('mcp command', () => {
  let consoleMock: ReturnType<typeof mockConsole>;
  let exitMock: ReturnType<typeof mockProcessExit>;
  let startServerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleMock = mockConsole();
    exitMock = mockProcessExit();
    startServerSpy = vi.spyOn(server, 'startServer').mockImplementation(() => {
      // Mock server start to avoid actually binding to a port
      return {} as ReturnType<typeof server.startServer>;
    });
  });

  afterEach(() => {
    consoleMock.restore();
    exitMock.restore();
    startServerSpy.mockRestore();
  });

  describe('validation', () => {
    it('should error if no project exists', async () => {
      await withTempDir(() => {
        try {
          mcpStartCommand({});
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);

        const errors = consoleMock.getErrors();
        expect(errors.some((err) => err.includes('No track project found'))).toBe(true);
      });
    });

    it('should error with invalid port', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        try {
          mcpStartCommand({ port: 99999 });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);
        expect(consoleMock.getLastError()).toContain('Port must be a number between 1 and 65535');
      });
    });

    it('should error with negative port', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        try {
          mcpStartCommand({ port: -1 });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);
        expect(consoleMock.getLastError()).toContain('Port must be a number between 1 and 65535');
      });
    });

    it('should error with zero port', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        try {
          mcpStartCommand({ port: 0 });
        } catch {
          // Expected to throw due to process.exit mock
        }

        expect(exitMock.wasExitCalled()).toBe(true);
        expect(exitMock.getExitCode()).toBe(1);
        expect(consoleMock.getLastError()).toContain('Port must be a number between 1 and 65535');
      });
    });
  });

  describe('successful start', () => {
    it('should start server with default port and host', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        mcpStartCommand({});

        expect(startServerSpy).toHaveBeenCalledWith(8765, '127.0.0.1');
        expect(consoleMock.getLogs().some((log) => log.includes('Starting MCP server'))).toBe(
          true
        );
      });
    });

    it('should start server with custom port', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        mcpStartCommand({ port: 9000 });

        expect(startServerSpy).toHaveBeenCalledWith(9000, '127.0.0.1');
      });
    });

    it('should start server with custom host', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        mcpStartCommand({ host: '0.0.0.0' });

        expect(startServerSpy).toHaveBeenCalledWith(8765, '0.0.0.0');
      });
    });

    it('should start server with custom port and host', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        mcpStartCommand({ port: 9000, host: '0.0.0.0' });

        expect(startServerSpy).toHaveBeenCalledWith(9000, '0.0.0.0');
      });
    });
  });

  describe('environment variable fallback', () => {
    it('should use MCP_PORT env var when no port option provided', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        process.env.MCP_PORT = '9500';
        mcpStartCommand({});
        delete process.env.MCP_PORT;

        expect(startServerSpy).toHaveBeenCalledWith(9500, '127.0.0.1');
      });
    });

    it('should use MCP_HOST env var when no host option provided', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        process.env.MCP_HOST = '192.168.1.1';
        mcpStartCommand({});
        delete process.env.MCP_HOST;

        expect(startServerSpy).toHaveBeenCalledWith(8765, '192.168.1.1');
      });
    });

    it('should prefer CLI option over env var for port', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        process.env.MCP_PORT = '9000';
        mcpStartCommand({ port: 9500 });
        delete process.env.MCP_PORT;

        expect(startServerSpy).toHaveBeenCalledWith(9500, '127.0.0.1');
      });
    });

    it('should prefer CLI option over env var for host', async () => {
      await withTempDir(() => {
        initCommand('Test Project');

        process.env.MCP_HOST = '192.168.1.1';
        mcpStartCommand({ host: '0.0.0.0' });
        delete process.env.MCP_HOST;

        expect(startServerSpy).toHaveBeenCalledWith(8765, '0.0.0.0');
      });
    });
  });
});
