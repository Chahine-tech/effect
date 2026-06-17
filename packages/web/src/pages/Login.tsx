import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { Either, Schema } from "effect"
import { ArrayFormatter } from "effect/ParseResult"
import { LoginPayload } from "@myapp/contract"
import { runApiResult } from "../lib/api"

type FieldErrors = Partial<Record<keyof typeof LoginPayload.fields, string>>

const FIELD_MESSAGES: Record<string, string> = {
  email: "Please enter a valid email address",
  password: "Password must be at least 8 characters",
}

function parseFieldErrors(error: Schema.Schema.Type<typeof Schema.String> extends never ? never : unknown): FieldErrors {
  const issues = ArrayFormatter.formatErrorSync(error as Parameters<typeof ArrayFormatter.formatErrorSync>[0])
  const errors: FieldErrors = {}
  for (const issue of issues) {
    const field = issue.path[0] as keyof FieldErrors
    if (field && !errors[field]) {
      errors[field] = FIELD_MESSAGES[field as string] ?? issue.message
    }
  }
  return errors
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const login = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      runApiResult((c) => c.auth.login({ payload: data })),
    onSuccess: (result) => {
      if (result._tag === "Ok") navigate({ to: "/users", search: { page: 1 } })
    },
  })

  const apiError = (() => {
    if (!login.data || login.data._tag === "Ok") return null
    const error = login.data.error
    switch (error._tag) {
      case "Unauthorized": return "Invalid email or password"
      case "TooManyRequests": return "Too many attempts, please wait"
      default: return "Something went wrong"
    }
  })()

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const result = Schema.decodeEither(LoginPayload)({ email, password }, { errors: "all" })
    if (Either.isLeft(result)) {
      setFieldErrors(parseFieldErrors(result.left))
      return
    }
    setFieldErrors({})
    login.mutate(result.right)
  }

  return (
    <div className="flex justify-center pt-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-slate-700">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: undefined })) }}
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${fieldErrors.email ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-slate-400"}`}
                required
              />
              {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-700">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })) }}
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${fieldErrors.password ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-slate-400"}`}
                required
              />
              {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            {apiError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {apiError}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="mt-1 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {login.isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-sm text-slate-500 text-center mt-5">
          Don't have an account?{" "}
          <Link to="/register" className="text-slate-900 hover:text-slate-600 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
