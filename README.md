# 06-TUrborepo

Polyglot-ready monorepo foundation using **Turborepo 2.9** + **pnpm 11** workspaces.

## Stack

| Layer               | Tool       | Version         |
| ------------------- | ---------- | --------------- |
| Package manager     | pnpm       | 11.x            |
| Build orchestrator  | Turborepo  | 2.9.x           |
| Node.js runtime     | Node       | 22 LTS          |
| Frontend            | Next.js    | 16.x            |
| Backend             | NestJS     | 11.x            |
| Database            | Prisma     | 7.x             |
| Linter (full)       | ESLint     | 9.x flat config |
| Linter (pre-flight) | Oxlint     | 1.x             |
| Formatter           | Prettier   | 3.x             |
| TypeScript          | TypeScript | 5.9             |

## Workspaces

```
apps/
  web/      # Next.js 16 application (@apps/web)
  api/      # NestJS 11 application (@apps/api)
packages/
  shared/             # Runtime contracts (@repo/shared)
  database/           # Prisma 7 client (@repo/database)
  config-eslint/      # Shared ESLint flat configs
  config-typescript/  # Shared tsconfig presets
```

## Prerequisites

- Node.js **>= 22** (see `.nvmrc`)
- pnpm **11** (auto-pinned via Corepack)

## Setup

```bash
corepack enable
corepack prepare pnpm@11.7.0 --activate
pnpm install
```

## Scripts

| Script         | Description                             |
| -------------- | --------------------------------------- |
| `pnpm dev`     | Run all dev servers in parallel         |
| `pnpm build`   | Build all workspaces                    |
| `pnpm lint`    | Lint all workspaces (ESLint)            |
| `pnpm lint:ox` | Pre-flight lint (Oxlint, sub-second)    |
| `pnpm test`    | Run all tests                           |
| `pnpm format`  | Format with Prettier                    |
| `pnpm clean`   | Remove all build outputs & node_modules |

## Turbo Pipeline

Defined in `turbo.json`:

- **build** → depends on `^build` and `^db:generate`
- **lint** → depends on `^build`, no outputs (read-only)
- **test** → depends on `^build`, outputs `coverage/`
- **dev** → persistent, no cache
- **db:generate** → Prisma client generation

## Remote Cache (CI)

Set the following repository secrets to enable Turborepo remote caching:

- `TURBO_TOKEN` — Vercel API token (or self-hosted)
- `TURBO_TEAM` — Vercel team slug (as a variable)

The CI workflow (`.github/workflows/ci.yml`) automatically wires these into every run.

## Pre-commit

Husky 9 runs `lint-staged` on every commit:

1. `oxlint --fix` on staged TS/JS files
2. `prettier --write` on staged files

A `pre-push` hook runs the full `turbo build lint test` pipeline.

## Path Aliases

- `@repo/shared/*` → `packages/shared/src/*`
- `@repo/database/*` → `packages/database/src/*`
- `@/*` → `apps/web/src/*` (Next.js)
- `@app/*` → `apps/api/src/*` (NestJS)
