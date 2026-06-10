import { HttpApi } from "@effect/platform"
import { AuthApi } from "./auth.api.js"
import { HealthApi } from "./health.api.js"
import { MetricsApi } from "./metrics.api.js"
import { UsersApi } from "./users.api.js"

export class MyApi extends HttpApi.make("api").add(HealthApi).add(UsersApi).add(AuthApi).add(MetricsApi) {}
