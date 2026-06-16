import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { runApi } from "../lib/api"
import { ErrorBoundary } from "./ErrorBoundary"

export function Root() {
  const navigate = useNavigate()
  const { location } = useRouterState()
  const path = location.pathname

  const logout = useMutation({
    mutationFn: () => runApi((c) => c.auth.logout()),
    onSettled: () => navigate({ to: "/login" }),
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-6">
          <Link to="/" className="font-semibold tracking-tight text-slate-900">
            MyApp
          </Link>

          {path !== "/login" && path !== "/register" && (
            <nav className="flex items-center gap-1">
              <Link
                to="/users"
                search={{ page: 1 }}
                className="px-3 py-1.5 rounded-md text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 [&.active]:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-medium transition-colors"
              >
                Users
              </Link>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {path === "/login" ? (
              <Link
                to="/register"
                className="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Sign up
              </Link>
            ) : path === "/register" ? (
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Sign in
              </Link>
            ) : (
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}
