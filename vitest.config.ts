import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/server.ts'],
    },
    testTimeout: 10000,
  },
});