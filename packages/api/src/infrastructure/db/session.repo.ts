import { and, eq, gt } from "drizzle-orm"
import { Effect, Layer } from "effect"
import { InternalError, Unauthorized } from "@myapp/contract"
import { SessionRepository } from "../../domain/session.js"
import { Database } from "./db.js"
import { sessions } from "./schema.js"

export const SessionRepositoryLive = Layer.effect(
  SessionRepository,
  Effect.gen(function* () {
    const db = yield* Database

    return {
      create: (userId, meta) =>
        Effect.gen(function* () {
          const token = yield* Effect.sync(() => {
            const bytes = crypto.getRandomValues(new Uint8Array(32))
            return Array.from(bytes)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")
          })
          yield* Effect.tryPromise({
            try: () =>
              db.insert(sessions).values({
                id: token,
                userId,
                expiresAt: new Date(Date.now() + 86400 * 1000),
                ip: meta.ip,
                userAgent: meta.userAgent,
              }),
            catch: (e) => new InternalError({ message: String(e) }),
          })
          return token
        }),

      verify: (token) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(sessions)
                .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date()))),
            catch: () => new Unauthorized({ message: "Invalid session" }),
          })
          const session = result[0]
          if (!session)
            return yield* Effect.fail(new Unauthorized({ message: "Session expired or not found" }))
          return { userId: session.userId }
        }),

      revoke: (token) =>
        Effect.tryPromise({
          try: () => db.delete(sessions).where(eq(sessions.id, token)),
          catch: (e) => new InternalError({ message: String(e) }),
        }).pipe(Effect.asVoid),

      revokeAll: (userId) =>
        Effect.tryPromise({
          try: () => db.delete(sessions).where(eq(sessions.userId, userId)),
          catch: (e) => new InternalError({ message: String(e) }),
        }).pipe(Effect.asVoid),
    }
  })
)
