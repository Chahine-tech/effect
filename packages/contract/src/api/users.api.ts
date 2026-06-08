import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import { BadRequest, Conflict, InternalError, NotFound } from "../errors.js"
import { Authentication } from "../middleware.js"
import { CreateUserPayload, User } from "../schemas.js"

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

export class UsersApi extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("list", "/")
      .addSuccess(Schema.Array(User))
      .addError(InternalError)
  )
  .add(
    HttpApiEndpoint.get("findById")`/${idParam}`
      .addSuccess(User)
      .addError(NotFound)
      .addError(InternalError)
  )
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(CreateUserPayload)
      .addSuccess(User, { status: 201 })
      .addError(BadRequest)
      .addError(Conflict)
      .addError(InternalError)
  )
  .add(
    HttpApiEndpoint.del("remove")`/${idParam}`
      .addSuccess(Schema.Void)
      .addError(NotFound)
      .addError(InternalError)
  )
  .middleware(Authentication)
  .prefix("/users")
  .annotateContext(OpenApi.annotations({ title: "Users API" }))
{}
