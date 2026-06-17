# Stage 1: Base
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/config-eslint/package.json packages/config-eslint/
COPY packages/config-typescript/package.json packages/config-typescript/

RUN pnpm install --frozen-lockfile

COPY turbo.json tsconfig.base.json ./
COPY apps/web/ apps/web/
COPY packages/ packages/

ENV NEXT_PUBLIC_API_URL=http://localhost:3001
RUN pnpm --filter @apps/web build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
