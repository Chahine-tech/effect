import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

export class MetricsApi extends HttpApiGroup.make("metrics").add(
  HttpApiEndpoint.get("snapshot", "/metrics").addSuccess(
    Schema.Struct({
      registrations_total: Schema.Number,
      logins_total: Schema.Number,
      auth_failures_total: Schema.Number,
    })
  )
) {}
