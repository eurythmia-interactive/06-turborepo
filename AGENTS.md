# AGENTS.md

Turborepo 2.9 + pnpm 11 workspaces. Next.js 16 (`apps/web`), NestJS 11 (`apps/api`), Prisma 7 (`packages/database`), shared TS types (`packages/shared`), shared eslint/tsconfig presets (`packages/config-*`).

## Toolchain (non-negotiable)

- **pnpm 11.7.0 only** — pinned via `packageManager` and Corepack. Do not use `npm`/`yarn`. Bootstrap: `corepack enable && corepack prepare pnpm@11.7.0 --activate`.
- **Node 22 LTS** (`engines: ">=22.0.0 <27.0.0"`, `.nvmrc=22`). The `Plan/` design docs mention Node 24/26 — outdated, ignore.
- `.npmrc` sets `save-exact=true` (every install pins exact version) and `block-exotic-subdeps=true` (no reaching into transitive deps).
- Adding a dep with native install scripts requires whitelisting it in `pnpm-workspace.yaml` under `allowBuilds` (currently: prisma, sharp, esbuild, @swc/core, unrs-resolver).

## Commands

Root scripts (all go through Turbo unless noted):

| Command                        | Notes                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                     | Parallel persistent dev servers (web :3000, api :3001)                                                                                              |
| `pnpm build`                   | Requires Prisma client. From clean state run `pnpm turbo run db:generate` first or Turbo's `^db:generate` dep will handle it once.                  |
| `pnpm lint`                    | Full ESLint per workspace (slow, type-aware)                                                                                                        |
| `pnpm lint:ox`                 | Root Oxlint pre-flight (sub-second). Run this for fast feedback.                                                                                    |
| `pnpm test`                    | **Misleading** — only `apps/api` defines a `test` script and it's `echo "no tests yet" && exit 0`. No real test framework is wired up anywhere yet. |
| `pnpm format` / `format:check` | Prettier on `**/*.{ts,tsx,js,jsx,json,md,yaml,yml}`                                                                                                 |
| `pnpm clean`                   | Removes `node_modules` and `.turbo` everywhere                                                                                                      |

Single-workspace work: `pnpm --filter @apps/web <cmd>`, `pnpm --filter @apps/api <cmd>`, `pnpm --filter @repo/database <cmd>`.

## Hooks (auto-run)

- **pre-commit** (Husky + lint-staged): `oxlint --fix` then `prettier --write` on staged files. ESLint does **not** run here — rely on `pnpm lint` or CI.
- **pre-push**: runs `pnpm turbo build lint test` end-to-end. Pushing is slow and will block on lint failures.

## Workspace shape

- `apps/api` — NestJS 11. Entrypoint `src/main.ts`, port 3001. Builds with plain `tsc -p tsconfig.json` (not `nest build`); dev is `nest start --watch`. Decorators + NodeNext (see `tsconfig.nest.json`).
- `apps/web` — Next.js 16 App Router (`src/app/`), port 3000.
- `packages/shared` and `packages/database` export **TypeScript source directly** (`main: ./src/index.ts`). `shared`'s `build` is `tsc --noEmit` (type-check only); `database`'s `build` is `prisma generate`. Consumers compile the TS themselves.
- `packages/config-eslint` exports flat configs: `@repo/config-eslint/{base,next,nest,library}`. Each workspace's `eslint.config.mjs` imports one.
- `packages/config-typescript` exports `tsconfig.{base,next,nest,lib}.json` extended via `@repo/config-typescript/...`.

## Path aliases — gotcha

Only the **Next.js** tsconfig declares `paths` (`@repo/shared`, `@repo/database`, `@/*`). The README mentions `@app/*` for the NestJS app — **not actually configured anywhere**. Backend resolves `@repo/*` via package.json `exports`, not path mapping. Don't introduce `@app/*` imports expecting them to work.

## Prisma

- Schema: `packages/database/prisma/schema.prisma` (SQLite, single `User` model).
- Config: `packages/database/prisma.config.ts` loads `dotenv` and reads `DATABASE_URL` from `packages/database/.env` (gitignored; copy from `.env.example`). Seed command points at `tsx prisma/seed.ts` but no seed file exists yet.
- Workflow: `pnpm --filter @repo/database db:generate | db:migrate | db:studio`.
- Turbo treats `db:generate` as a cached input dependency for every `build` (`dependsOn: ["^build", "^db:generate"]`). CI runs `db:generate` explicitly before `build`.

## CI

`.github/workflows/ci.yml` runs on push/PR to `main`: install → `db:generate` → `build` → `lint` → `test` → `lint:ox`. Wires `TURBO_TOKEN` (secret) + `TURBO_TEAM` (var) for remote cache.

## Style

Prettier: single quotes, semis, trailing-all, width 100, LF. ESLint base bans `console` except `warn|error|info`, requires inline type-imports, allows `_`-prefixed unused vars. `library` preset escalates `no-explicit-any` to error (applies to `packages/database`, `packages/shared`).

## Misc

- No commits exist yet on `main`.
- `Plan/` holds design docs and is excluded from Prettier; treat as aspirational, not authoritative.
- Do not commit `.env`, `*.tsbuildinfo`, or anything under `.turbo/`, `.next/`, `dist/`.
