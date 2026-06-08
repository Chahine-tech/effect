import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { LoginUseCase, LoginUseCaseLive } from "../../application/auth/login.js"
import { FakePasswordService } from "../helpers/fake-password.service.js"
import { InMemorySessionRepo } from "../helpers/in-memory-session.repo.js"
import { makeInMemoryUserRepo } from "../helpers/in-memory-user.repo.js"

const meta = { ip: "127.0.0.1", userAgent: "test" }

const TestLayer = LoginUseCaseLive.pipe(
  Layer.provide(makeInMemoryUserRepo([{ id: 1, name: "Alice", email: "alice@example.com", passwordHash: "hashed:password123" }])),
  Layer.provide(InMemorySessionRepo),
  Layer.provide(FakePasswordService)
)

describe("LoginUseCase", () => {
  it.effect("returns a session token on valid credentials", () =>
    Effect.gen(function* () {
      const login = yield* LoginUseCase
      const token = yield* login({ email: "alice@example.com", password: "password123", meta })
      expect(token).toBeTypeOf("string")
      expect(token.length).toBeGreaterThan(0)
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("fails with Unauthorized on wrong password", () =>
    Effect.gen(function* () {
      const login = yield* LoginUseCase
      const result = yield* login({ email: "alice@example.com", password: "wrong", meta }).pipe(Effect.flip)
      expect(result._tag).toBe("Unauthorized")
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("fails with Unauthorized on unknown email", () =>
    Effect.gen(function* () {
      const login = yield* LoginUseCase
      const result = yield* login({ email: "nobody@example.com", password: "password123", meta }).pipe(Effect.flip)
      expect(result._tag).toBe("Unauthorized")
    }).pipe(Effect.provide(TestLayer))
  )
})
