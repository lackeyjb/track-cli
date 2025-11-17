import { vi } from 'vitest';

/**
 * Mock console.log and console.error to capture output.
 * Returns helpers to access captured output.
 */
export function mockConsole() {
  const logs: string[] = [];
  const errors: string[] = [];

  const logSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
    logs.push(args.join(' '));
  });

  const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args.join(' '));
  });

  return {
    logs,
    errors,
    getLogs: () => logs,
    getErrors: () => errors,
    getLastLog: () => logs[logs.length - 1],
    getLastError: () => errors[errors.length - 1],
    restore: () => {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}

/**
 * Mock process.exit to prevent tests from exiting.
 * Returns helper to check if exit was called and with what code.
 * Note: Throws an error to stop execution (simulating exit behavior).
 */
export function mockProcessExit() {
  const exitCalls: number[] = [];

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
    const exitCode = typeof code === 'number' ? code : 1;
    exitCalls.push(exitCode);
    // Throw error to stop execution (simulates exit behavior)
    throw new MockProcessExitError(exitCode);
  });

  return {
    exitCalls,
    wasExitCalled: () => exitCalls.length > 0,
    getExitCode: () => exitCalls[exitCalls.length - 1],
    getAllExitCodes: () => exitCalls,
    restore: () => {
      exitSpy.mockRestore();
    },
  };
}

/**
 * Error thrown when mocked process.exit is called.
 * Tests should catch this to verify exit behavior.
 */
export class MockProcessExitError extends Error {
  constructor(public exitCode: number) {
    super(`Process exited with code ${exitCode}`);
    this.name = 'MockProcessExitError';
  }
}

/**
 * Create a deterministic ID generator for testing.
 * Returns a function that generates sequential IDs.
 */
export function createMockIdGenerator(prefix = 'TEST') {
  let counter = 0;
  return () => `${prefix}${String(counter++).padStart(4, '0')}`;
}

/**
 * Create a deterministic timestamp generator for testing.
 * Returns a function that generates timestamps starting from a base time.
 */
export function createMockTimestampGenerator(baseTime = '2025-01-01T00:00:00.000Z') {
  let offset = 0;
  return () => {
    const date = new Date(baseTime);
    date.setSeconds(date.getSeconds() + offset);
    offset++;
    return date.toISOString();
  };
}

/**
 * Mock both generateId and getCurrentTimestamp for deterministic tests.
 */
export function mockDeterministicUtils() {
  const idGenerator = createMockIdGenerator();
  const timestampGenerator = createMockTimestampGenerator();

  // We'll need to mock at the module level
  // This is a placeholder - actual implementation depends on how we want to inject these
  return {
    generateId: idGenerator,
    getCurrentTimestamp: timestampGenerator,
  };
}
