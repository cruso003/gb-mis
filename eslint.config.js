// @ts-check
const baseConfig = require('@gb-mis/eslint-config');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.expo/**',
      'packages/db/src/generated/**',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
    ],
  },
  // Shared rules for all TypeScript files
  ...baseConfig,

  // NestJS DI relies on emitDecoratorMetadata — constructor parameter types must be
  // value imports (not type-only) so TypeScript emits the actual class in design:paramtypes.
  // Disabling consistent-type-imports for all API source files.
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
