import { Context, Effect, Layer, PubSub } from "effect"
import type { InternalError, NotFound } from "@myapp/contract"
import { UserRepository } from "../../domain/user.js"
import { UserEventBus } from "../../infrastructure/events.js"

export class RemoveUserUseCase extends Context.Tag("RemoveUserUseCase")<
  RemoveUserUseCase,
  (id: number) => Effect.Effect<void, NotFound | InternalError>
>() {}

export const RemoveUserUseCaseLive = Layer.effect(
  RemoveUserUseCase,
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const eventBus = yield* UserEventBus

    return (id) =>
      userRepo.remove(id).pipe(
        Effect.tap(() => PubSub.publish(eventBus, { _tag: "UserRemoved", userId: id })),
        Effect.withSpan("RemoveUserUseCase", { attributes: { id } })
      )
  })
)
