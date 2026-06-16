import { Context, Effect, Layer } from "effect"
import type { InternalError, User } from "@myapp/contract"
import { UserRepository } from "../../domain/user.js"

export class ListUsersUseCase extends Context.Tag("ListUsersUseCase")<
  ListUsersUseCase,
  (params: { limit: number; offset: number }) => Effect.Effect<{ users: ReadonlyArray<User>; total: number }, InternalError>
>() {}

export const ListUsersUseCaseLive = Layer.effect(
  ListUsersUseCase,
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    return Effect.fn("ListUsersUseCase")((params: { limit: number; offset: number }) =>
      userRepo.list(params)
    )
  })
)
