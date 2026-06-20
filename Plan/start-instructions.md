# Dev Environment Start/Stop Instructions

## Kill Everything

**All processes (Node + Docker DB):**
```bash
pkill -9 -f "node" && pnpm db:down
```

**Surgical (if you have other Node processes running):**
```bash
pkill -9 -f "next" && pkill -9 -f "nest" && pnpm db:down
```

---

## Start Everything

```bash
pnpm dev
```

This runs `docker compose up -d db --wait` first (starts PostgreSQL), then `turbo run dev` (starts API on :3001 and web on :3000).

---

## Individual Services

```bash
pnpm db:up               # Start database only
pnpm --filter api dev    # API only (port 3001)
pnpm --filter web dev    # Web only (port 3000)
```

---

## Useful Commands

```bash
pnpm db:logs             # Tail database logs
pnpm db:verify           # Verify database connection
pnpm db:studio           # Open Prisma Studio
pnpm db:generate         # Regenerate Prisma client
pnpm test                # Run all tests
pnpm lint                # Run linter
pnpm build               # Build all packages
```
