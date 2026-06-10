import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect, Layer, TestClock, TestContext } from "effect"
import { HttpServerRequest } from "@effect/platform"
import { RateLimiter, RateLimiterLive } from "../../interface/middleware/rate-limit.middleware.js"

const LIMIT = 3
const WINDOW_MS = 60_000

const makeReqLayer = (ip: string) =>
  Layer.succeed(
    HttpServerRequest.HttpServerRequest,
    { headers: { "x-forwarded-for": ip } } as any
  )

const check = (ip: string) =>
  Effect.gen(function* () {
    const rl = yield* RateLimiter
    yield* rl.check(LIMIT, WINDOW_MS).pipe(Effect.provide(makeReqLayer(ip)))
  })

const TestLayer = Layer.mergeAll(RateLimiterLive, TestContext.TestContext)

describe("RateLimiter", () => {
  it.effect("allows requests under the limit", () =>
    Effect.gen(function* () {
      for (let i = 0; i < LIMIT; i++) {
        yield* check("1.2.3.4")
      }
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("blocks requests over the limit", () =>
    Effect.gen(function* () {
      for (let i = 0; i < LIMIT; i++) {
        yield* check("1.2.3.4")
      }
      const result = yield* check("1.2.3.4").pipe(Effect.flip)
      expect(result._tag).toBe("TooManyRequests")
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("is isolated per IP address", () =>
    Effect.gen(function* () {
      for (let i = 0; i < LIMIT; i++) {
        yield* check("1.2.3.4")
      }
      yield* check("9.9.9.9")
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("resets after the window expires", () =>
    Effect.gen(function* () {
      for (let i = 0; i < LIMIT; i++) {
        yield* check("1.2.3.4")
      }
      yield* TestClock.adjust("61 seconds")
      yield* check("1.2.3.4")
    }).pipe(Effect.provide(TestLayer))
  )
})
