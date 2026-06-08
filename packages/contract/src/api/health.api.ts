import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

export class HealthApi extends HttpApiGroup.make("health")
  .add(
    HttpApiEndpoint.get("check", "/health")
      .addSuccess(Schema.Struct({ status: Schema.Literal("ok"), uptime: Schema.Number }))
  )
{}
