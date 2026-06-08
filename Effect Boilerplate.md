# Boilerplate — Full Effect Stack (`@effect/platform-node`)

> Basé sur l'exemple officiel du repo Effect-TS (`platform-node/examples/api.ts`)
> Stack : Effect + @effect/platform-node + Drizzle (PostgreSQL) + Sessions opaques (httpOnly cookie)

---

## Pourquoi ces choix

| Sujet | Choix | Pourquoi |
|---|---|---|
| HTTP | `@effect/platform-node` 100% Effect | Telemetry, erreurs typées et middleware cohérents de bout en bout |
| ORM | Drizzle | Typesafe statique, intégration `Layer` naturelle, pas de codegen |
| Auth storage | Session opaque en DB | Révocation instantanée, logout côté serveur réel, pas de blacklist |
| Cookie | `HttpOnly; Secure; SameSite=Strict` | XSS mitigation, CSRF mitigation, token jamais exposé au JS client |

> **Pourquoi pas JWT ?**
> JWT stateless = impossible de révoquer un token avant expiration. Si le cookie est volé, la session reste valide jusqu'au bout. Avec une session opaque en DB, un `DELETE` suffit pour déconnecter immédiatement.
>
> JWT garde du sens pour les architectures microservices où des services distincts ont besoin de vérifier l'identité sans appel DB. Pour un backend monolithique, session opaque c'est plus simple et plus safe.

---

## Structure du projet

```
my-app/
├── src/
│   ├── api/
│   │   ├── index.ts            # Définition de l'API (HttpApi + groupes)
│   │   ├── users.api.ts        # Groupe UsersApi
│   │   ├── auth.api.ts         # Groupe AuthApi (login/logout)
│   │   └── errors.ts           # Erreurs tagguées partagées
│   ├── impl/
│   │   ├── users.impl.ts       # Implémentation groupe users
│   │   ├── auth.impl.ts        # Implémentation groupe auth + middleware
│   │   └── middleware.impl.ts  # Authentication middleware (lecture cookie)
│   ├── services/
│   │   ├── db.ts               # Layer Drizzle
│   │   └── session.ts          # SessionService (create/verify/revoke)
│   ├── db/
│   │   └── schema.ts           # Schema Drizzle (tables)
│   ├── server.ts               # Lancement du serveur
│   └── client.ts               # Client typé (optionnel, pour tests)
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## Installation

```bash
pnpm add effect @effect/platform @effect/platform-node
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg typescript tsx @types/node
```

`package.json` scripts :

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "tsx src/server.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

`tsconfig.json` minimal :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "exactOptionalPropertyTypes": true
  }
}
```

`drizzle.config.ts` :

```typescript
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

---

## 1. Erreurs partagées (`src/api/errors.ts`)

```typescript
import { HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

export class NotFound extends Schema.TaggedError<NotFound>()(
  "NotFound",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 401 })
) {}

export class BadRequest extends Schema.TaggedError<BadRequest>()(
  "BadRequest",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 400 })
) {}

export class DbError extends Schema.TaggedError<DbError>()(
  "DbError",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 500 })
) {}
```

---

## 2. Schema Drizzle (`src/db/schema.ts`)

```typescript
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),           // crypto.randomBytes(32).toString('hex')
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  userAgent: text("user_agent"),
  ip: text("ip"),
})
```

---

## 3. Service DB (`src/services/db.ts`)

```typescript
import { drizzle } from "drizzle-orm/node-postgres"
import { Context, Effect, Layer } from "effect"
import { Pool } from "pg"
import * as schema from "../db/schema.js"

export class Db extends Context.Tag("Db")<
  Db,
  ReturnType<typeof drizzle<typeof schema>>
>() {}

export const DbLive = Layer.scoped(
  Db,
  Effect.acquireRelease(
    Effect.sync(() => {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      return drizzle(pool, { schema })
    }),
    (db) => Effect.promise(() => (db.$client as Pool).end())
  )
)
```

---

## 4. SessionService (`src/services/session.ts`)

```typescript
import { and, eq, gt } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { sessions } from "../db/schema.js"
import { DbError, Unauthorized } from "../api/errors.js"
import { Db } from "./db.js"

export interface SessionMeta {
  ip: string
  userAgent: string
}

export class SessionService extends Context.Tag("SessionService")<
  SessionService,
  {
    // Crée une session, retourne le token opaque
    create: (userId: number, meta: SessionMeta) => Effect.Effect<string, DbError>
    // Vérifie le token, retourne le userId
    verify: (token: string) => Effect.Effect<{ userId: number }, Unauthorized>
    // Révoque une session (logout)
    revoke: (token: string) => Effect.Effect<void, DbError>
    // Révoque toutes les sessions d'un user ("déconnecter partout")
    revokeAll: (userId: number) => Effect.Effect<void, DbError>
  }
>() {}

export const SessionServiceLive = Layer.effect(
  SessionService,
  Effect.gen(function* () {
    const db = yield* Db

    return {
      create: (userId, meta) =>
        Effect.gen(function* () {
          const token = yield* Effect.sync(() =>
            crypto.getRandomValues(new Uint8Array(32))
              |> Array.from(%)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")
          )
          yield* Effect.tryPromise({
            try: () =>
              db.insert(sessions).values({
                id: token,
                userId,
                expiresAt: new Date(Date.now() + 86400 * 1000), // 24h
                ...meta,
              }),
            catch: (e) => new DbError({ message: String(e) }),
          })
          return token
        }),

      verify: (token) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(sessions)
                .where(
                  and(
                    eq(sessions.id, token),
                    gt(sessions.expiresAt, new Date())
                  )
                ),
            catch: () => new Unauthorized({ message: "Invalid session" }),
          })
          const session = result[0]
          if (!session) return yield* new Unauthorized({ message: "Session expired or not found" })
          return { userId: session.userId }
        }),

      revoke: (token) =>
        Effect.tryPromise({
          try: () => db.delete(sessions).where(eq(sessions.id, token)),
          catch: (e) => new DbError({ message: String(e) }),
        }),

      revokeAll: (userId) =>
        Effect.tryPromise({
          try: () => db.delete(sessions).where(eq(sessions.userId, userId)),
          catch: (e) => new DbError({ message: String(e) }),
        }),
    }
  })
)
```

---

## 5. Définition de l'API (`src/api/users.api.ts`)

```typescript
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import { NotFound } from "./errors.js"

export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
}) {}

export class CreateUserPayload extends Schema.Class<CreateUserPayload>("CreateUserPayload")({
  name: Schema.String,
  email: Schema.String,
}) {}

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

export class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("findById")`/${idParam}`
      .addSuccess(User)
      .addError(NotFound)
  )
  .add(
    HttpApiEndpoint.get("list", "/")
      .addSuccess(Schema.Array(User))
  )
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(CreateUserPayload)
      .addSuccess(User, { status: 201 })
  )
  .add(
    HttpApiEndpoint.del("remove")`/${idParam}`
      .addSuccess(Schema.Void)
      .addError(NotFound)
  )
  .prefix("/users")
  .annotateContext(OpenApi.annotations({ title: "Users API" }))
{}
```

---

## 6. API Auth (`src/api/auth.api.ts`)

```typescript
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import { Unauthorized } from "./errors.js"

export class LoginPayload extends Schema.Class<LoginPayload>("LoginPayload")({
  email: Schema.String,
  password: Schema.String,
}) {}

export class AuthApi extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("login", "/login")
      .setPayload(LoginPayload)
      .addSuccess(Schema.Void, { status: 204 })
      .addError(Unauthorized)
  )
  .add(
    HttpApiEndpoint.post("logout", "/logout")
      .addSuccess(Schema.Void, { status: 204 })
  )
  .prefix("/auth")
  .annotateContext(OpenApi.annotations({ title: "Auth API" }))
{}
```

---

## 7. API principale (`src/api/index.ts`)

```typescript
import { HttpApi } from "@effect/platform"
import { UsersApi } from "./users.api.js"
import { AuthApi } from "./auth.api.js"

export class MyApi extends HttpApi.make("api")
  .add(UsersApi)
  .add(AuthApi)
{}
```

---

## 8. Middleware authentication (`src/impl/middleware.impl.ts`)

```typescript
import { HttpApiMiddleware, HttpApiSecurity, HttpServerRequest } from "@effect/platform"
import { Context, Effect, Layer } from "effect"
import { Unauthorized } from "../api/errors.js"
import { User } from "../api/users.api.js"
import { SessionService } from "../services/session.js"
import { Db } from "../services/db.js"
import { users } from "../db/schema.js"
import { eq } from "drizzle-orm"

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

// Helper : parse un cookie depuis le header
const parseCookie = (req: HttpServerRequest.HttpServerRequest, name: string) =>
  Effect.gen(function* () {
    const header = req.headers["cookie"] ?? ""
    const match = header.match(new RegExp(`${name}=([^;]+)`))
    if (!match) return yield* Effect.fail("no cookie")
    return match[1]
  })

export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Authentication",
  {
    failure: Unauthorized,
    provides: CurrentUser,
    // Pas de `security: bearer` — on lit le cookie httpOnly manuellement
  }
) {}

export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const sessionService = yield* SessionService
    const db = yield* Db

    return Authentication.of({
      middleware: Effect.gen(function* () {
        const req = yield* HttpServerRequest.HttpServerRequest
        const token = yield* parseCookie(req, "session").pipe(
          Effect.mapError(() => new Unauthorized({ message: "No session cookie" }))
        )
        const { userId } = yield* sessionService.verify(token)
        const result = yield* Effect.tryPromise({
          try: () => db.select().from(users).where(eq(users.id, userId)),
          catch: () => new Unauthorized({ message: "User not found" }),
        })
        const user = result[0]
        if (!user) return yield* new Unauthorized({ message: "User not found" })
        return new User({ id: user.id, name: user.name, email: user.email })
      }),
    })
  })
)
```

---

## 9. Implémentation Auth (`src/impl/auth.impl.ts`)

```typescript
import { HttpApiBuilder, HttpServerResponse } from "@effect/platform"
import { Effect, Layer } from "effect"
import { MyApi } from "../api/index.js"
import { Unauthorized } from "../api/errors.js"
import { SessionService } from "../services/session.js"
import { Db } from "../services/db.js"
import { users } from "../db/schema.js"
import { eq } from "drizzle-orm"

// Utilitaire cookie
const SESSION_COOKIE = (token: string) =>
  `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`

const CLEAR_COOKIE =
  `session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`

export const AuthImplLive = HttpApiBuilder.group(
  MyApi,
  "auth",
  (handlers) =>
    handlers
      .handle("login", ({ payload }) =>
        Effect.gen(function* () {
          const db = yield* Db
          const sessionService = yield* SessionService

          // Récupère l'user
          const result = yield* Effect.tryPromise({
            try: () => db.select().from(users).where(eq(users.email, payload.email)),
            catch: () => new Unauthorized({ message: "Invalid credentials" }),
          })
          const user = result[0]
          if (!user) return yield* new Unauthorized({ message: "Invalid credentials" })

          // Vérifie le password — remplace par ton vrai hash check (ex: argon2)
          const valid = payload.password === "todo_hash_check"
          if (!valid) return yield* new Unauthorized({ message: "Invalid credentials" })

          // Crée la session
          const token = yield* sessionService.create(user.id, {
            ip: "unknown",      // récupère depuis req headers si besoin
            userAgent: "unknown",
          })

          // Set le cookie httpOnly
          yield* HttpApiBuilder.withResponse(
            HttpServerResponse.setHeader("Set-Cookie", SESSION_COOKIE(token))
          )
        })
      )
      .handle("logout", (_) =>
        HttpApiBuilder.withResponse(
          HttpServerResponse.setHeader("Set-Cookie", CLEAR_COOKIE)
        )
      )
).pipe(Layer.provide([SessionService.Default ?? Layer.empty, Db]))
```

---

## 10. Implémentation Users (`src/impl/users.impl.ts`)

```typescript
import { HttpApiBuilder } from "@effect/platform"
import { Effect, Layer } from "effect"
import { eq } from "drizzle-orm"
import { MyApi } from "../api/index.js"
import { NotFound, DbError } from "../api/errors.js"
import { User } from "../api/users.api.js"
import { Db } from "../services/db.js"
import { AuthenticationLive } from "./middleware.impl.js"
import { users } from "../db/schema.js"

export const UsersLive = HttpApiBuilder.group(
  MyApi,
  "users",
  (handlers) =>
    handlers
      .handle("list", (_) =>
        Effect.gen(function* () {
          const db = yield* Db
          const rows = yield* Effect.tryPromise({
            try: () => db.select().from(users),
            catch: (e) => new DbError({ message: String(e) }),
          })
          return rows.map((r) => new User({ id: r.id, name: r.name, email: r.email }))
        })
      )
      .handle("findById", ({ path: { id } }) =>
        Effect.gen(function* () {
          const db = yield* Db
          const result = yield* Effect.tryPromise({
            try: () => db.select().from(users).where(eq(users.id, id)),
            catch: (e) => new DbError({ message: String(e) }),
          })
          const user = result[0]
          if (!user) return yield* new NotFound({ message: `User ${id} not found` })
          return new User({ id: user.id, name: user.name, email: user.email })
        })
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const db = yield* Db
          const result = yield* Effect.tryPromise({
            try: () =>
              db.insert(users)
                .values({ ...payload, passwordHash: "todo" })
                .returning(),
            catch: (e) => new DbError({ message: String(e) }),
          })
          const user = result[0]
          return new User({ id: user.id, name: user.name, email: user.email })
        })
      )
      .handle("remove", ({ path: { id } }) =>
        Effect.gen(function* () {
          const db = yield* Db
          const result = yield* Effect.tryPromise({
            try: () =>
              db.delete(users).where(eq(users.id, id)).returning(),
            catch: (e) => new DbError({ message: String(e) }),
          })
          if (!result[0]) return yield* new NotFound({ message: `User ${id} not found` })
        })
      )
).pipe(Layer.provide(AuthenticationLive))
```

---

## 11. Serveur (`src/server.ts`)

```typescript
import {
  HttpApiBuilder,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"
import { MyApi } from "./api/index.js"
import { UsersLive } from "./impl/users.impl.js"
import { AuthImplLive } from "./impl/auth.impl.js"
import { DbLive } from "./services/db.js"
import { SessionServiceLive } from "./services/session.js"

const ServicesLive = Layer.mergeAll(DbLive, SessionServiceLive)

const ApiLive = HttpApiBuilder.api(MyApi).pipe(
  Layer.provide([UsersLive, AuthImplLive]),
  Layer.provide(ServicesLive)
)

HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiSwagger.layer()),           // Swagger UI sur /docs
  Layer.provide(HttpApiBuilder.middlewareOpenApi()),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(ApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)
```

---

## 12. Client typé (`src/client.ts`)

```typescript
import { FetchHttpClient, HttpApiClient } from "@effect/platform"
import { Effect } from "effect"
import { MyApi } from "./api/index.js"

const program = Effect.gen(function* () {
  const client = yield* HttpApiClient.make(MyApi, {
    baseUrl: "http://localhost:3000",
  })

  // Login — le cookie session est set automatiquement par le navigateur/fetch
  yield* client.auth.login({ payload: { email: "alice@example.com", password: "secret" } })

  const users = yield* client.users.list()
  console.log("users:", users)

  const user = yield* client.users.findById({ path: { id: 1 } })
  console.log("user:", user)

  yield* client.auth.logout()
})

program.pipe(
  Effect.provide(FetchHttpClient.layer),
  Effect.runPromise
)
```

---

## Référence rapide

| Sujet | Pattern |
|---|---|
| Définir un groupe | `class MonGroupe extends HttpApiGroup.make("nom")...{}` |
| Param de path | `HttpApiSchema.param("id", Schema.NumberFromString)` |
| Status d'erreur | `HttpApiSchema.annotations({ status: 404 })` dans le `TaggedError` |
| Middleware auth | `HttpApiMiddleware.Tag` + `provides: CurrentUser` |
| Lecture cookie | `req.headers["cookie"]` dans le middleware |
| Set cookie httpOnly | `HttpApiBuilder.withResponse(HttpServerResponse.setHeader(...))` |
| Swagger UI | `HttpApiSwagger.layer()` → `/docs` |
| Client typé | `HttpApiClient.make(MyApi, { baseUrl })` |
| Lancer le serveur | `HttpApiBuilder.serve(...).pipe(..., Layer.launch, NodeRuntime.runMain)` |
| Wrap Promise Drizzle | `Effect.tryPromise({ try: () => db.select()..., catch: (e) => new DbError(...) })` |

---

## Checklist avant prod

- [ ] Remplacer le hash check mock par `argon2` ou `bcrypt`
- [ ] Lire `ip` et `user-agent` depuis les headers de la request dans `auth.impl.ts`
- [ ] Ajouter `DATABASE_URL` dans `.env` (ne jamais committer)
- [ ] Ajouter `@effect/opentelemetry` pour le tracing distribué
- [ ] Mettre en place un job de nettoyage des sessions expirées (`DELETE FROM sessions WHERE expires_at < NOW()`)
- [ ] Séparer les `Schema` dans un package partagé si monorepo
- [ ] Ajouter des tests avec `HttpApiClient` + `Layer` de test en mémoire
