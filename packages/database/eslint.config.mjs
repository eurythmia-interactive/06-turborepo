import library from '@repo/config-eslint/library';

export default [
  ...library,
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/**', 'src/generated/**'],
  },
];
