import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { CreateUserUseCase, CreateUserUseCaseLive } from "../../application/users/create-user.js"
import { UserEventBusLive } from "../../infrastructure/events.js"
import { FakePasswordService } from "../helpers/fake-password.service.js"
import { makeInMemoryUserRepo } from "../helpers/in-memory-user.repo.js"

const TestLayer = CreateUserUseCaseLive.pipe(
  Layer.provide(makeInMemoryUserRepo()),
  Layer.provide(FakePasswordService),
  Layer.provide(UserEventBusLive)
)

describe("CreateUserUseCase", () => {
  it.effect("creates a user successfully", () =>
    Effect.gen(function* () {
      const createUser = yield* CreateUserUseCase
      const user = yield* createUser({ name: "Alice", email: "alice@example.com", password: "password123" })
      expect(user.name).toBe("Alice")
      expect(user.email).toBe("alice@example.com")
      expect(user.id).toBeTypeOf("number")
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("rejects a password shorter than 8 characters", () =>
    Effect.gen(function* () {
      const createUser = yield* CreateUserUseCase
      const result = yield* createUser({ name: "Bob", email: "bob@example.com", password: "short" }).pipe(
        Effect.flip
      )
      expect(result._tag).toBe("BadRequest")
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("rejects duplicate emails", () =>
    Effect.gen(function* () {
      const createUser = yield* CreateUserUseCase
      yield* createUser({ name: "Alice", email: "alice@example.com", password: "password123" })
      const result = yield* createUser({ name: "Alice2", email: "alice@example.com", password: "password456" }).pipe(
        Effect.flip
      )
      expect(result._tag).toBe("Conflict")
    }).pipe(Effect.provide(TestLayer))
  )
})
