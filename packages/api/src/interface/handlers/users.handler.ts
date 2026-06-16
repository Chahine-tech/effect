import { HttpApiBuilder } from "@effect/platform"
import { Effect, Layer } from "effect"
import { MyApi, PaginatedUsers } from "@myapp/contract"
import { CreateUserUseCase } from "../../application/users/create-user.js"
import { GetUserUseCase } from "../../application/users/get-user.js"
import { ListUsersUseCase } from "../../application/users/list-users.js"
import { RemoveUserUseCase } from "../../application/users/remove-user.js"
import { UpdateUserUseCase } from "../../application/users/update-user.js"
import { AuthenticationLive } from "../middleware/auth.middleware.js"

export const UsersHandlerLive = HttpApiBuilder.group(
  MyApi,
  "users",
  (handlers) =>
    handlers
      .handle("list", ({ urlParams: { limit, offset } }) =>
        Effect.gen(function* () {
          const listUsers = yield* ListUsersUseCase
          const { users, total } = yield* listUsers({ limit, offset })
          return new PaginatedUsers({ users, total, offset, limit })
        })
      )
      .handle("findById", ({ path: { id } }) =>
        Effect.gen(function* () {
          const getUser = yield* GetUserUseCase
          return yield* getUser(id)
        })
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const createUser = yield* CreateUserUseCase
          return yield* createUser({
            name: payload.name,
            email: payload.email,
            password: payload.password,
          })
        })
      )
      .handle("update", ({ path: { id }, payload }) =>
        Effect.gen(function* () {
          const updateUser = yield* UpdateUserUseCase
          return yield* updateUser(id, {
            ...(payload.name !== undefined ? { name: payload.name } : {}),
            ...(payload.email !== undefined ? { email: payload.email } : {}),
          })
        })
      )
      .handle("remove", ({ path: { id } }) =>
        Effect.gen(function* () {
          const removeUser = yield* RemoveUserUseCase
          return yield* removeUser(id)
        })
      )
).pipe(Layer.provide(AuthenticationLive))
