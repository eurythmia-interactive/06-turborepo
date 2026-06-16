import next from '@repo/config-eslint/next';

export default [
  ...next,
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
];
