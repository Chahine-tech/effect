import { Effect, Layer } from "effect"
import { PasswordService } from "../../domain/password.js"

export const FakePasswordService = Layer.succeed(PasswordService, {
  hash: (password) => Effect.succeed(`hashed:${password}`),
  verify: (password, hash) => Effect.succeed(hash === `hashed:${password}`),
})
