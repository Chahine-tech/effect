import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { Either, Schema } from "effect"
import { ArrayFormatter } from "effect/ParseResult"
import { RegisterPayload } from "@myapp/contract"
import { runApiResult } from "../lib/api"

type FieldErrors = Partial<Record<keyof typeof RegisterPayload.fields | "confirmPassword", string>>

const FIELD_MESSAGES: Record<string, string> = {
  name: "Name must be between 1 and 50 characters",
  email: "Please enter a valid email address",
  password: "Password must be at least 8 characters",
}

function parseFieldErrors(error: unknown): FieldErrors {
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

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const register = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const reg = await runApiResult((c) => c.auth.register({ payload: data }))
      if (reg._tag === "Err") return reg
      return runApiResult((c) => c.auth.login({ payload: { email: data.email, password: data.password } }))
    },
    onSuccess: (result) => {
      if (result._tag === "Ok") navigate({ to: "/users", search: { page: 1 } })
    },
  })

  const apiError = (() => {
    if (!register.data || register.data._tag === "Ok") return null
    const error = register.data.error
    switch (error._tag) {
      case "Conflict": return "Email already in use"
      case "BadRequest": return "Invalid data provided"
      case "TooManyRequests": return "Too many attempts, please wait"
      default: return "Something went wrong"
    }
  })()

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const result = Schema.decodeEither(RegisterPayload)({ name, email, password }, { errors: "all" })
    if (Either.isLeft(result)) {
      setFieldErrors(parseFieldErrors(result.left))
      return
    }
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" })
      return
    }
    setFieldErrors({})
    register.mutate(result.right)
  }

  return (
    <div className="flex justify-center pt-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="mt-1.5 text-sm text-slate-500">Start for free, no credit card required</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-name" className="text-sm font-medium text-slate-700">Name</label>
              <input
                id="register-name"
                type="text"
                placeholder="Alice"
                value={name}
                onChange={(e) => { setName(e.target.value); setFieldErrors((f) => ({ ...f, name: undefined })) }}
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${fieldErrors.name ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-slate-400"}`}
              />
              {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-email" className="text-sm font-medium text-slate-700">Email</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: undefined })) }}
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${fieldErrors.email ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-slate-400"}`}
              />
              {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-password" className="text-sm font-medium text-slate-700">Password</label>
              <input
                id="register-password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })) }}
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${fieldErrors.password ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-slate-400"}`}
              />
              {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-confirm-password" className="text-sm font-medium text-slate-700">Confirm password</label>
              <input
                id="register-confirm-password"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((f) => ({ ...f, confirmPassword: undefined })) }}
                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${fieldErrors.confirmPassword ? "border-red-300 focus:ring-red-400" : "border-slate-200 focus:ring-slate-400"}`}
              />
              {fieldErrors.confirmPassword && <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
            </div>

            {apiError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {apiError}
              </p>
            )}

            <button
              type="submit"
              disabled={register.isPending}
              className="mt-1 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {register.isPending ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-sm text-slate-500 text-center mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-slate-900 hover:text-slate-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
