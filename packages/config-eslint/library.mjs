import base from './base.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
