import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import { BadRequest, Conflict, InternalError, NotFound } from "../errors.js"
import { Authentication } from "../middleware.js"
import { CreateUserPayload, PaginatedUsers, UpdateUserPayload, User } from "../schemas.js"

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

export class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("list", "/")
      .setUrlParams(Schema.Struct({
        limit: Schema.optionalWith(Schema.NumberFromString, { default: () => 10 }),
        offset: Schema.optionalWith(Schema.NumberFromString, { default: () => 0 }),
      }))
      .addSuccess(PaginatedUsers)
      .addError(InternalError)
      .annotate(OpenApi.Summary, "List users")
      .annotate(OpenApi.Description, "Paginated list of all users. Requires an active session.")
  )
  .add(
    HttpApiEndpoint.get("findById")`/${idParam}`
      .addSuccess(User)
      .addError(NotFound)
      .addError(InternalError)
      .annotate(OpenApi.Summary, "Get user")
  )
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(CreateUserPayload)
      .addSuccess(User, { status: 201 })
      .addError(BadRequest)
      .addError(Conflict)
      .addError(InternalError)
      .annotate(OpenApi.Summary, "Create user")
  )
  .add(
    HttpApiEndpoint.patch("update")`/${idParam}`
      .setPayload(UpdateUserPayload)
      .addSuccess(User)
      .addError(NotFound)
      .addError(Conflict)
      .addError(InternalError)
      .annotate(OpenApi.Summary, "Update user")
      .annotate(OpenApi.Description, "Partial update — only provided fields are modified.")
  )
  .add(
    HttpApiEndpoint.del("remove")`/${idParam}`
      .addSuccess(Schema.Void)
      .addError(NotFound)
      .addError(InternalError)
      .annotate(OpenApi.Summary, "Delete user")
  )
  .middleware(Authentication)
  .prefix("/users")
  .annotateContext(OpenApi.annotations({ title: "Users", description: "User management. All endpoints require authentication." }))
{}
