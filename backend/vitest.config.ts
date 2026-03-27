import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'tests/coverage',
      include: ['src/**/*.ts'],
      exclude: ['tests/**', '**/*.d.ts']
    }
  }
});
