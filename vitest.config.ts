import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node.js environment for CLI testing
    environment: 'node',

    // Include test files
    include: ['src/**/*.test.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/__tests__/**', 'src/index.ts'],
      // Aim for high coverage on critical paths
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Global test timeout
    testTimeout: 10000,
  },
});
