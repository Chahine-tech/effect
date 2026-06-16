import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  redirect,
} from "@tanstack/react-router"
import { Root } from "./components/Root"
import { runApiResult } from "./lib/api"
import { LoginPage } from "./pages/Login"
import { RegisterPage } from "./pages/Register"
import { UsersPage } from "./pages/Users"

const rootRoute = createRootRoute({ component: Root })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/users" search={{ page: 1 }} />,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
})

const PAGE_SIZE = 10

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  validateSearch: (search: Record<string, unknown>) => ({
    page: Math.max(1, Number(search.page) || 1),
  }),
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: async ({ deps: { page }, abortController }) => {
    const signal = abortController.signal
    const offset = (page - 1) * PAGE_SIZE
    const result = await runApiResult(
      (c) => c.users.list({ urlParams: { limit: PAGE_SIZE, offset } }),
      signal
    )
    if (result._tag === "Err") {
      if (result.error._tag === "Unauthorized") throw redirect({ to: "/login" })
      throw result.error
    }
    return result.value
  },
  component: UsersPage,
})

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, registerRoute, usersRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
