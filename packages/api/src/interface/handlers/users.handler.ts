import { HttpApiBuilder } from "@effect/platform"
import { Effect, Layer } from "effect"
import { MyApi } from "@myapp/contract"
import { CreateUserUseCase } from "../../application/users/create-user.js"
import { GetUserUseCase } from "../../application/users/get-user.js"
import { ListUsersUseCase } from "../../application/users/list-users.js"
import { RemoveUserUseCase } from "../../application/users/remove-user.js"
import { AuthenticationLive } from "../middleware/auth.middleware.js"

export const UsersHandlerLive = HttpApiBuilder.group(
  MyApi,
  "users",
  (handlers) =>
    handlers
      .handle("list", (_) =>
        Effect.gen(function* () {
          const listUsers = yield* ListUsersUseCase
          return yield* listUsers()
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
      .handle("remove", ({ path: { id } }) =>
        Effect.gen(function* () {
          const removeUser = yield* RemoveUserUseCase
          return yield* removeUser(id)
        })
      )
).pipe(Layer.provide(AuthenticationLive))
