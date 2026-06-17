# Chapter 1 — Session Report

**Date:** 2026-06-16
**Scope:** Multi-App Monorepo Foundation & Tooling (Turborepo + pnpm)
**Source plan:** [`Plan/CH-01.md`](../Plan/CH-01.md)

---

## Summary

Implemented the monorepo foundation defined in `Plan/CH-01.md`: a Turborepo 2.9 + pnpm 11 workspace with Next.js 16 (web), NestJS 11 (api), Prisma 7 (database), shared TypeScript packages, ESLint 9 flat config, Prettier 3, Oxlint, and Husky pre-commit hooks.

---

## Actions Taken

### 1. Plan Analysis & Corrections

- Reviewed `Plan/CH-01.md` and identified **6 critical issues**:
  - incorrect `config.yaml` reference (pnpm uses `.npmrc` only)
  - `workspace workspace` typo
  - vague CI task (not actionable)
  - incorrect "SQLite backing indexes" wording
  - overly strict `hoist=false` (breaks CLI binaries)
  - version uncertainty on bleeding-edge releases
- Clarified **4 design decisions** with you:
  - pin to latest stable
  - add minimal essentials only (Husky + lint-staged)
  - pragmatic hoisting
  - concrete CI (GitHub Actions workflow)

### 2. Directory & File Scaffolding

Created 7 workspaces and wrote **45+ config/source files**:

- Root: `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `.gitignore`, `.prettierrc`, `.prettierignore`, `README.md`
- Per-workspace: `package.json`, `tsconfig.json`, `eslint.config.mjs`
- Shared packages: `tsconfig.{base,next,nest,lib}.json` (config-typescript), `base/next/nest/library.mjs` (config-eslint)
- Domain: `nest-cli.json`, `prisma.config.ts`, `prisma/schema.prisma`, `ci.yml`, Husky hooks

### 3. Toolchain Setup

- Pinned **pnpm 11.7.0** via Corepack (`packageManager` field)
- Installed **650+ packages** across 7 workspaces
- Approved build scripts for `@prisma/engines`, `prisma`, `sharp`, `esbuild`, `@swc/core`, `unrs-resolver` via pnpm 11's new `allowBuilds` gate

### 4. Source Code

- **Next.js 16** App Router (`page.tsx`, `layout.tsx`)
- **NestJS 11** with `/` and `/health` endpoints
- **Shared** package with `createResponse<T>()` helper
- **Database** package with Prisma `User` model (SQLite)

### 5. Pipeline Verification

- `pnpm turbo run build lint test` — 10/10 tasks pass
- `pnpm lint:ox` — 0 errors on 16 files (~17ms)
- `pnpm format:check` — all files conform
- Smoke-tested NestJS startup — routes registered successfully

---

## Results

| Metric                  | Value                   |
| ----------------------- | ----------------------- |
| Workspaces              | 7 (2 apps + 5 packages) |
| Files created           | ~50 tracked             |
| Packages installed      | 650+                    |
| Build time (cold)       | ~15s                    |
| Build time (cached)     | ~3.7s (FULL TURBO)      |
| Lint errors             | 0                       |
| Format violations       | 0                       |
| Oxlint warnings         | 0                       |
| NestJS routes           | 2 (`/`, `/health`)      |
| Next.js pages           | 2 (`/`, `/_not-found`)  |
| Turborepo tasks passing | 10/10                   |

### Pinned Versions

| Tool        | Version    |
| ----------- | ---------- |
| Node.js     | `>=22.0.0` |
| pnpm        | 11.7.0     |
| Turborepo   | 2.9.18     |
| Next.js     | 16.2.9     |
| NestJS      | 11.1.27    |
| Prisma      | 7.8.0      |
| ESLint      | 9.39.1     |
| Prettier    | 3.8.4      |
| Oxlint      | 1.70.0     |
| TypeScript  | 5.9.3      |
| Husky       | 9.1.7      |
| lint-staged | 17.0.7     |

---

## Issues Encountered & Fixed

| #   | Issue                             | Root Cause                                                      | Fix                                                                 |
| --- | --------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Prisma 7 P1012 validation error   | `url` no longer allowed in `schema.prisma` (breaking change)    | Created `prisma.config.ts` with `datasource.url`                    |
| 2   | pnpm 11 blocked build scripts     | New `allowBuilds` security gate                                 | Added explicit `allowBuilds: true` entries in `pnpm-workspace.yaml` |
| 3   | ESM warning on eslint.config.js   | CJS default + ESM syntax triggers perf overhead                 | Renamed to `.mjs` (Node treats as ESM unconditionally)              |
| 4   | TS6059 rootDir error              | Relative paths resolved from defining file, not extending       | Moved `outDir`/`rootDir`/`baseUrl` to per-app tsconfig              |
| 5   | ESM `.js` extension error         | `type: "module"` + `module: "NodeNext"` requires explicit `.js` | Reverted api to CJS (NestJS 11 default)                             |
| 6   | NestJS silent no-emit under Turbo | `nest build` didn't emit `dist/` when invoked via Turbo         | Switched build script to `tsc -p tsconfig.json`                     |
| 7   | Prettier flagged `next-env.d.ts`  | Auto-generated file not excluded by explicit path               | Added explicit entry to `.prettierignore` and `.gitignore`          |

---

## Current State

- All 17 todo items completed
- Pipeline fully functional: `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm lint:ox`, `pnpm format:check` all pass
- Cache working: second run is 4× faster (FULL TURBO)
- 3 benign turbo warnings remain (no-op test, `--noEmit` tsc, prisma to `.pnpm`) — non-blocking
- Git repo initialized on `main` (no commits yet)
- Full log saved at [`logs/CH-01-log.md`](../logs/CH-01-log.md) (308 lines)

---

## Deferred (per your decisions)

- Changesets / versioning automation
- Commitlint / conventional commits
- Dependabot / Renovate
- Devcontainer / Docker
- VS Code workspace settings
