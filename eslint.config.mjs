import eslintConfigPrettier from 'eslint-config-prettier';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      'countrystatecity-npm/dist/**',
      'countrystatecity-mcp/dist/**',
      'out/**',
      'node_modules/**',
      '.next/**',
      '.source/**',
      'server/**',
      '.data-sync/**',
      '.rollup.cache/**',
      'analysis/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  eslintConfigPrettier,
];

export default config;
