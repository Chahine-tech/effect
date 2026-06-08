import { Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
}) {}

export class LoginPayload extends Schema.Class<LoginPayload>("LoginPayload")({
  email: Schema.String,
  password: Schema.String,
}) {}

export class RegisterPayload extends Schema.Class<RegisterPayload>("RegisterPayload")({
  name: Schema.String,
  email: Schema.String,
  password: Schema.String,
}) {}

export class CreateUserPayload extends Schema.Class<CreateUserPayload>("CreateUserPayload")({
  name: Schema.String,
  email: Schema.String,
  password: Schema.String,
}) {}
