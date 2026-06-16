import nest from '@repo/config-eslint/nest';

export default [
  ...nest,
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.d.ts'],
  },
];
