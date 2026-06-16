import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { Schema } from "effect"
import { BadRequest, Conflict, InternalError, TooManyRequests, Unauthorized } from "../errors.js"
import { LoginPayload, RegisterPayload, User } from "../schemas.js"

export class AuthApi extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("register", "/register")
      .setPayload(RegisterPayload)
      .addSuccess(User, { status: 201 })
      .addError(BadRequest)
      .addError(Conflict)
      .addError(TooManyRequests)
      .addError(InternalError)
      .annotate(OpenApi.Summary, "Register")
      .annotate(OpenApi.Description, "Create a new user account. Sets a session cookie on success.")
  )
  .add(
    HttpApiEndpoint.post("login", "/login")
      .setPayload(LoginPayload)
      .addSuccess(Schema.Void, { status: 204 })
      .addError(Unauthorized)
      .addError(TooManyRequests)
      .addError(InternalError)
      .annotate(OpenApi.Summary, "Login")
      .annotate(OpenApi.Description, "Authenticate with email and password. Sets a session cookie (24 h sliding TTL).")
  )
  .add(
    HttpApiEndpoint.post("logout", "/logout")
      .addSuccess(Schema.Void, { status: 204 })
      .addError(InternalError)
      .annotate(OpenApi.Summary, "Logout")
      .annotate(OpenApi.Description, "Revoke the current session cookie.")
  )
  .prefix("/auth")
  .annotateContext(OpenApi.annotations({ title: "Auth", description: "Session-based authentication." }))
{}
