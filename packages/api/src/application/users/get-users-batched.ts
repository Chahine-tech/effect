import { Context, Effect, Layer, Request, RequestResolver } from "effect"
import type { InternalError, NotFound, User } from "@myapp/contract"
import { NotFound as NotFoundError } from "@myapp/contract"
import { UserRepository } from "../../domain/user.js"

interface GetUserByIdReq extends Request.Request<User, NotFound | InternalError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

const GetUserByIdReq = Request.tagged<GetUserByIdReq>("GetUserById")

export class GetUserBatchedUseCase extends Context.Tag("GetUserBatchedUseCase")<
  GetUserBatchedUseCase,
  (id: number) => Effect.Effect<User, NotFound | InternalError>
>() {}

export const GetUserBatchedUseCaseLive = Layer.effect(
  GetUserBatchedUseCase,
  Effect.gen(function* () {
    const repo = yield* UserRepository

    const resolver = RequestResolver.makeBatched(
      (requests: [GetUserByIdReq, ...GetUserByIdReq[]]) =>
        Effect.gen(function* () {
          const ids = requests.map((r) => r.id)
          const users = yield* repo.findManyByIds(ids)
          const byId = new Map(users.map((u) => [u.id, u]))

          yield* Effect.forEach(
            requests,
            (req) => {
              const user = byId.get(req.id)
              return user
                ? Request.succeed(req, user)
                : Request.fail(req, new NotFoundError({ message: `User ${req.id} not found` }))
            },
            { discard: true }
          )
        })
    )

    return (id) =>
      Effect.request(GetUserByIdReq({ id }), resolver).pipe(
        Effect.withSpan("GetUserBatchedUseCase", { attributes: { id } })
      )
  })
)
