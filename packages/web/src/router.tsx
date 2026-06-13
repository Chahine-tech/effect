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
  component: () => <Navigate to="/users" />,
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

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  loader: async ({ abortController }) => {
    const signal = abortController.signal
    // signal fires if the user navigates away before the loader completes —
    // the Effect fiber is interrupted, preventing stale state updates.
    const result = await runApiResult((c) => c.users.list(), signal)
    if (result._tag === "Err") {
      // result.error is typed as Unauthorized | InternalError
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
