import { Context, Effect, Layer, PubSub, Queue } from "effect"

export type UserEvent =
  | { readonly _tag: "UserCreated"; readonly userId: number; readonly email: string }
  | { readonly _tag: "UserRemoved"; readonly userId: number }

export class UserEventBus extends Context.Tag("UserEventBus")<
  UserEventBus,
  PubSub.PubSub<UserEvent>
>() {}

export const UserEventBusLive = Layer.scoped(
  UserEventBus,
  PubSub.unbounded<UserEvent>()
)

export const EventWorkerLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const bus = yield* UserEventBus
    const queue = yield* PubSub.subscribe(bus)
    yield* Queue.take(queue).pipe(
      Effect.flatMap((event) => Effect.logInfo(`UserEvent[${event._tag}]`, event)),
      Effect.forever,
      Effect.forkDaemon
    )
  })
)
