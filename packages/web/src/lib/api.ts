import { FetchHttpClient, HttpApiClient } from "@effect/platform"
import { Cause, Effect, Exit, Fiber, Option } from "effect"
import { MyApi } from "@myapp/contract"

export const getClient = HttpApiClient.make(MyApi, { baseUrl: "" }).pipe(
  Effect.provide(FetchHttpClient.layer)
)

type Uneffect<T> = T extends Effect.Effect<infer A, infer _E, infer _R> ? A : never
export type ApiClient = Uneffect<typeof getClient>

export type ApiOk<A> = { readonly _tag: "Ok"; readonly value: A }
export type ApiErr<E> = { readonly _tag: "Err"; readonly error: E }
export type ApiResult<A, E> = ApiOk<A> | ApiErr<E>

// Type-safe bridge: E is preserved, Promise never rejects on typed failures.
// Accepts an optional AbortSignal: if fired, the underlying Effect fiber is
// interrupted and the Promise rejects with DOMException("AbortError").
export const runApiResult = <A, E>(
  f: (client: ApiClient) => Effect.Effect<A, E, never>,
  signal?: AbortSignal
): Promise<ApiResult<A, E>> => {
  const program = Effect.gen(function* () {
    const client = yield* getClient
    return yield* f(client)
  })

  if (!signal) {
    return Effect.runPromiseExit(program).then(exitToApiResult)
  }

  const fiber = Effect.runFork(program)

  const onAbort = () => { Effect.runFork(Fiber.interrupt(fiber)) }
  signal.addEventListener("abort", onAbort, { once: true })

  return Effect.runPromise(Fiber.await(fiber))
    .then((exit): ApiResult<A, E> => {
      if (Exit.isSuccess(exit)) return { _tag: "Ok", value: exit.value }
      if (Cause.isInterrupted(exit.cause)) throw new DOMException("Aborted", "AbortError")
      const failure = Cause.failureOption(exit.cause)
      if (Option.isSome(failure)) return { _tag: "Err", error: failure.value }
      throw new Error("Unexpected defect")
    })
    .finally(() => signal.removeEventListener("abort", onAbort))
}

// Fire-and-forget variant for cases where errors don't need handling (e.g. logout)
export const runApi = <A, E>(
  f: (client: ApiClient) => Effect.Effect<A, E, never>
): Promise<A> =>
  Effect.gen(function* () {
    const client = yield* getClient
    return yield* f(client)
  }).pipe(
    Effect.runPromiseExit,
  ).then((exit) => {
    if (Exit.isSuccess(exit)) return exit.value
    const failure = Cause.failureOption(exit.cause)
    if (Option.isSome(failure)) throw failure.value
    throw new Error("Unexpected defect")
  })

function exitToApiResult<A, E>(exit: Exit.Exit<A, E>): ApiResult<A, E> {
  if (Exit.isSuccess(exit)) return { _tag: "Ok", value: exit.value }
  const failure = Cause.failureOption(exit.cause)
  if (Option.isSome(failure)) return { _tag: "Err", error: failure.value }
  throw new Error("Unexpected defect")
}
