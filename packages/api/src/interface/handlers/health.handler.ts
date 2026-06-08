import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { MyApi } from "@myapp/contract"

const startTime = Date.now()

export const HealthHandlerLive = HttpApiBuilder.group(MyApi, "health", (handlers) =>
  handlers.handle("check", () =>
    Effect.succeed({ status: "ok" as const, uptime: Math.floor((Date.now() - startTime) / 1000) })
  )
)
