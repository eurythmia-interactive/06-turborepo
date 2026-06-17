# Stage 1: Base
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate
RUN apk add --no-cache openssl

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/config-eslint/package.json packages/config-eslint/
COPY packages/config-typescript/package.json packages/config-typescript/

RUN pnpm install --frozen-lockfile

COPY turbo.json tsconfig.base.json ./
COPY apps/api/ apps/api/
COPY packages/ packages/

ENV DATABASE_URL="placeholder"
RUN pnpm --filter @repo/database db:generate
RUN pnpm --filter @apps/api build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/src/generated ./packages/database/src/generated
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm

USER nestjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "dist/main.js"]
