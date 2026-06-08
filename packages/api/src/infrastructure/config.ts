import { Config, Context, Effect, Layer } from "effect"

export interface AppConfigShape {
  databaseUrl: string
  port: number
}

export class AppConfig extends Context.Tag("AppConfig")<AppConfig, AppConfigShape>() {}

export const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const databaseUrl = yield* Config.string("DATABASE_URL")
    const port = yield* Config.withDefault(Config.integer("PORT"), 3000)
    return { databaseUrl, port }
  })
)
