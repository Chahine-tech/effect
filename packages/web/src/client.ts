import { FetchHttpClient, HttpApiClient } from "@effect/platform"
import { Effect } from "effect"
import { MyApi } from "@myapp/contract"

export const makeClient = HttpApiClient.make(MyApi, {
  baseUrl: "http://localhost:3000",
}).pipe(Effect.provide(FetchHttpClient.layer))

const program = Effect.gen(function* () {
  const client = yield* makeClient

  const user = yield* client.auth.register({
    payload: { name: "Alice", email: "alice@example.com", password: "supersecret123" },
  })

  yield* client.auth.login({
    payload: { email: "alice@example.com", password: "supersecret123" },
  })

  const users = yield* client.users.list()
  const found = yield* client.users.findById({ path: { id: user.id } })

  yield* client.auth.logout()

  return { users, found }
})

program.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise)
