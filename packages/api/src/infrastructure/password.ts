import * as argon2 from "argon2"
import { Effect, Layer } from "effect"
import { InternalError } from "@myapp/contract"
import { PasswordService } from "../domain/password.js"

export const PasswordServiceLive = Layer.succeed(PasswordService, {
  hash: (password) =>
    Effect.tryPromise({
      try: () => argon2.hash(password),
      catch: (e) => new InternalError({ message: String(e) }),
    }),

  verify: (password, hash) =>
    Effect.tryPromise({
      try: () => argon2.verify(hash, password),
      catch: (e) => new InternalError({ message: String(e) }),
    }),
})
