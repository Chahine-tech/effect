import { Schema } from "effect"

const Email = Schema.String.pipe(Schema.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/))
const Password = Schema.String.pipe(Schema.minLength(8))
const Name = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50))

export class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
}) {}

export class LoginPayload extends Schema.Class<LoginPayload>("LoginPayload")({
  email: Email,
  password: Password,
}) {}

export class RegisterPayload extends Schema.Class<RegisterPayload>("RegisterPayload")({
  name: Name,
  email: Email,
  password: Password,
}) {}

export class CreateUserPayload extends Schema.Class<CreateUserPayload>("CreateUserPayload")({
  name: Name,
  email: Email,
  password: Password,
}) {}

export class UpdateUserPayload extends Schema.Class<UpdateUserPayload>("UpdateUserPayload")({
  name: Schema.optional(Name),
  email: Schema.optional(Email),
}) {}

export class PaginatedUsers extends Schema.Class<PaginatedUsers>("PaginatedUsers")({
  users: Schema.Array(User),
  total: Schema.Number,
  offset: Schema.Number,
  limit: Schema.Number,
}) {}
