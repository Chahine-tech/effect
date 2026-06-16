import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"

export class HealthApi extends HttpApiGroup.make("health")
  .add(
    HttpApiEndpoint.get("check", "/health")
      .addSuccess(Schema.Struct({ status: Schema.Literal("ok"), uptime: Schema.Number }))
      .annotate(OpenApi.Summary, "Health check")
      .annotate(OpenApi.Description, "Returns API liveness status and process uptime in seconds.")
  )
  .annotateContext(OpenApi.annotations({ title: "Health" }))
{}
