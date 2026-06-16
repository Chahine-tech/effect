import { Context, Effect, Layer } from "effect"
import type { Conflict, InternalError, NotFound, User } from "@myapp/contract"
import { UserRepository, type UpdateUserInput } from "../../domain/user.js"

export class UpdateUserUseCase extends Context.Tag("UpdateUserUseCase")<
  UpdateUserUseCase,
  (id: number, input: UpdateUserInput) => Effect.Effect<User, NotFound | Conflict | InternalError>
>() {}

export const UpdateUserUseCaseLive = Layer.effect(
  UpdateUserUseCase,
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    return Effect.fn("UpdateUserUseCase")((id: number, input: UpdateUserInput) =>
      userRepo.update(id, input)
    )
  })
)
