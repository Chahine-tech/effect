import { Effect, Layer, Redacted } from "effect"
import { Authentication, CurrentUser, SESSION_COOKIE_SCHEME, Unauthorized } from "@myapp/contract"
import { SessionRepository } from "../../domain/session.js"
import { UserRepository } from "../../domain/user.js"

export { Authentication, CurrentUser, SESSION_COOKIE_SCHEME }

export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const sessionRepo = yield* SessionRepository
    const userRepo = yield* UserRepository

    return Authentication.of({
      session: (token) =>
        Effect.gen(function* () {
          const { userId } = yield* sessionRepo.verify(Redacted.value(token))
          return yield* userRepo.findById(userId)
        }).pipe(
          Effect.mapError((e) =>
            e instanceof Unauthorized ? e : new Unauthorized({ message: "Unauthorized" })
          )
        ),
    })
  })
)
