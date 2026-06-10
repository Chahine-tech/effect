import { Migrator, SqlClient } from "@effect/sql"
import { PgClient, PgMigrator } from "@effect/sql-pg"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Config, Effect, Layer, Redacted } from "effect"

const createTables = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  yield* sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  yield* sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      user_agent TEXT,
      ip TEXT
    )
  `
})

const SqlClientLive = PgClient.layerConfig({
  url: Config.map(Config.string("DATABASE_URL"), Redacted.make),
})

const MigratorLive = PgMigrator.layer({
  loader: Migrator.fromRecord({
    "0001_create_tables": createTables,
  }),
})

Layer.launch(
  MigratorLive.pipe(
    Layer.provide(SqlClientLive),
    Layer.provide(NodeContext.layer)
  )
).pipe(NodeRuntime.runMain)
