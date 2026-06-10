import { Effect, Schema } from "effect"
import { SqlError } from "@effect/sql/SqlError"
import { Conflict, InternalError } from "@myapp/contract"

export { SqlError }

export const sqlError = (e: SqlError): InternalError =>
  new InternalError({ message: e.message ?? "Unknown SQL error" })

export const sqlConflictOrError =
  (conflictMessage: string) =>
  (e: SqlError): Conflict | InternalError => {
    const code = (e.cause as { code?: string } | undefined)?.code
    if (code === "23505") return new Conflict({ message: conflictMessage })
    return new InternalError({ message: e.message ?? "Unknown SQL error" })
  }

export const decodeMany =
  <A, I>(schema: Schema.Schema<A, I>) =>
  (r: readonly unknown[]): Effect.Effect<readonly A[], InternalError> =>
    Schema.decodeUnknown(Schema.Array(schema))(r).pipe(
      Effect.mapError((e) => new InternalError({ message: String(e) }))
    )
