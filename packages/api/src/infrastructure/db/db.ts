import { PgClient } from "@effect/sql-pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { Config, Context, Effect, Layer, Redacted, Schedule } from "effect"
import { Pool } from "pg"
import { AppConfig } from "../config.js"
import * as schema from "./schema.js"

export class Database extends Context.Tag("Database")<
  Database,
  ReturnType<typeof drizzle<typeof schema>>
>() {}

const connectWithRetry = Effect.gen(function* () {
  const { databaseUrl } = yield* AppConfig
  const pool = new Pool({ connectionString: databaseUrl })
  yield* Effect.tryPromise({ try: () => pool.query("SELECT 1"), catch: (e) => e }).pipe(
    Effect.retry(Schedule.exponential("200 millis").pipe(Schedule.intersect(Schedule.recurs(5)))),
    Effect.tapError((e) => Effect.logError("DB connection failed", e))
  )
  return drizzle(pool, { schema })
})

export const DbLive = Layer.scoped(
  Database,
  Effect.acquireRelease(
    connectWithRetry,
    (db) => Effect.promise(() => (db.$client as Pool).end())
  )
)

export const SqlClientLive = PgClient.layerConfig({
  url: Config.map(Config.string("DATABASE_URL"), Redacted.make),
})
