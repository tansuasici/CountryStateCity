import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: [
      'countrystatecity-npm/src/__tests__/**/*.test.ts',
      'countrystatecity-mcp/src/__tests__/**/*.test.ts',
      'countrystatecity-graphql/src/__tests__/**/*.test.ts',
      'countrystatecity-api/src/__tests__/**/*.test.ts',
      'lib/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'countrystatecity-npm/src/**/*.ts',
        'countrystatecity-mcp/src/**/*.ts',
        'countrystatecity-graphql/src/**/*.ts',
        'countrystatecity-api/src/**/*.ts',
      ],
      exclude: ['node_modules', '.next', 'out', 'dist', '**/__tests__/**', '**/*.d.ts'],
    },
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
    },
  },
});
