# Effect API Boilerplate

Production-ready REST API with Effect, clean architecture, and end-to-end type safety.

## Stack

- **Effect** — runtime, error handling, DI, tracing, logging
- **@effect/platform** — HTTP server, typed API (HttpApi)
- **Drizzle ORM** — schema + migrations (PostgreSQL)
- **argon2** — password hashing
- **pnpm workspaces** — monorepo (`contract` / `api` / `web`)

## Structure

```
packages/
  contract/   # shared types, API schema, errors (framework-agnostic)
  api/        # backend — clean architecture
    src/
      domain/         # ports (Context.Tag interfaces)
      application/    # use cases
      infrastructure/ # adapters (DB, password)
      interface/      # HTTP handlers, middleware
  web/        # future frontend (HttpApiClient ready)
```

## Quick start

```bash
# Prerequisites: Docker, Node.js 22+, pnpm

docker compose up -d        # start PostgreSQL
pnpm install
pnpm db:migrate             # run migrations
pnpm dev                    # start server on :3000
```

Swagger UI → http://localhost:3000/docs

## Commands

```bash
pnpm dev            # dev server with watch
pnpm test           # run all tests (unit + HTTP integration)
pnpm db:generate    # generate migration from schema changes
pnpm db:migrate     # apply migrations
```

## Environment

```bash
DATABASE_URL=postgresql://api:api@localhost:5433/api
PORT=3000                    # optional, default 3000
NODE_ENV=production          # switches logger to JSON
```

## Features

- Cookie-based auth (httpOnly session, server-side revocation)
- Rate limiting (10 req/min per IP on auth routes)
- Request tracing with `Effect.withSpan`
- Pretty logs in dev, JSON logs in prod
- DB connection retry on startup (exponential backoff)
- Effect DevTools compatible
- 12 tests — unit (use cases) + HTTP integration (in-memory, no DB)
