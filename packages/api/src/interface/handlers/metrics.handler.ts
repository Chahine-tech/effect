import { HttpApiBuilder } from "@effect/platform"
import { Effect, Metric } from "effect"
import { MyApi } from "@myapp/contract"
import { authFailuresTotal, loginsTotal, registrationsTotal } from "../../infrastructure/metrics.js"

export const MetricsHandlerLive = HttpApiBuilder.group(MyApi, "metrics", (handlers) =>
  handlers.handle("snapshot", () =>
    Effect.gen(function* () {
      const regs = yield* Metric.value(registrationsTotal)
      const logins = yield* Metric.value(loginsTotal)
      const failures = yield* Metric.value(authFailuresTotal)
      return {
        registrations_total: regs.count,
        logins_total: logins.count,
        auth_failures_total: failures.count,
      }
    })
  )
)
