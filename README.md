# Effect Fullstack Boilerplate

Production-ready fullstack monorepo with Effect, React, and end-to-end type safety.

## Stack

**Backend**
- **Effect** — runtime, error handling, DI, tracing, metrics, PubSub
- **@effect/platform** — HTTP server, typed API (HttpApi)
- **@effect/sql-pg** — PostgreSQL queries + migrations (no ORM)
- **argon2** — password hashing
- **oxlint** — fast linter

**Frontend**
- **Vite + React 19** — dev server with HMR
- **TanStack Router** — code-based routing with loader-level auth guards
- **TanStack Query** — mutations and cache invalidation
- **Tailwind CSS v4** — zero-config utility styles

**Shared**
- **@myapp/contract** — `HttpApi` definition consumed by both API handlers and `HttpApiClient` on the frontend; renaming any endpoint breaks both sides at compile time

## Structure

```
packages/
  contract/   # shared API schema, types, errors
  api/        # backend — clean architecture
    src/
      domain/         # ports (Context.Tag interfaces)
      application/    # use cases
      infrastructure/ # adapters (DB, password, events, metrics)
      interface/      # HTTP handlers, middleware
      migrate.ts      # standalone migration runner
  web/        # frontend — Vite + React
    src/
      lib/            # Effect → Promise bridge, QueryClient
      pages/          # Login, Register, Users
      components/     # Root layout + nav
      router.tsx      # route tree with loaders
      main.tsx        # entry point
```

## Quick start

```bash
# Prerequisites: Docker, Node.js 22+, pnpm

docker compose up -d        # start PostgreSQL
pnpm install
pnpm db:migrate             # run migrations
pnpm dev                    # API on :3000, frontend on :5173
```

Frontend → http://localhost:5173  
Swagger UI → http://localhost:3000/docs

## Commands

```bash
pnpm dev            # API + frontend concurrently
pnpm dev:api        # API only
pnpm dev:web        # frontend only
pnpm test           # unit + HTTP integration tests (in-memory, no DB)
pnpm typecheck      # tsc across all packages
pnpm lint           # oxlint
pnpm db:migrate     # apply migrations
```

## Environment

```bash
DATABASE_URL=postgresql://api:api@localhost:5433/api
PORT=3000                    # optional, default 3000
NODE_ENV=production          # switches logger to JSON
```

## Features

- End-to-end type safety via shared `HttpApi` contract — no codegen, no manual types
- Cookie-based auth (httpOnly session, server-side revocation)
- Vite proxy — frontend calls relative URLs, no CORS setup needed
- Loader-level auth guard — unauthenticated requests redirect to `/login` before render
- Rate limiting per IP with `TestClock`-compatible implementation
- `Effect.Cache` on `GetUserUseCase` (LRU, 5 min TTL)
- Request batching (`RequestResolver.makeBatched`) for bulk user lookups
- Metrics counters (`/metrics`) — registrations, logins, auth failures
- PubSub event bus — `UserCreated` / `UserRemoved` with daemon worker
- Request tracing with `Effect.withSpan`
- Schema-validated SQL rows — `Schema.decodeUnknown` on every query result
- Pretty logs in dev, JSON logs in prod
- 16 tests — unit (use cases) + HTTP integration (in-memory, no DB)
