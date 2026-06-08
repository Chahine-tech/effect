import { Context, Effect } from "effect"
import { InternalError } from "@myapp/contract"

export class PasswordService extends Context.Tag("PasswordService")<
  PasswordService,
  {
    hash: (password: string) => Effect.Effect<string, InternalError>
    verify: (password: string, hash: string) => Effect.Effect<boolean, InternalError>
  }
>() {}
