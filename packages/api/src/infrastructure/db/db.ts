import { PgClient } from "@effect/sql-pg"
import { Config, Redacted } from "effect"

export const SqlClientLive = PgClient.layerConfig({
  url: Config.map(Config.string("DATABASE_URL"), Redacted.make),
})
