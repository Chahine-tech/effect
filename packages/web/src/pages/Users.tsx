import { getRouteApi, useRouter } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { runApi } from "../lib/api"
import { useUserEvents } from "../lib/useUserEvents"

const routeApi = getRouteApi("/users")

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
]

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function UsersPage() {
  const users = routeApi.useLoaderData()
  const router = useRouter()
  useUserEvents()

  const remove = useMutation({
    mutationFn: (id: number) => runApi((c) => c.users.remove({ path: { id } })),
    onSuccess: () => router.invalidate(),
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
          {users.length}
        </span>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No users yet.</div>
      ) : (
        <div className="grid gap-2">
          {users.map((user) => {
            const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length]
            const isRemoving = remove.isPending && remove.variables === user.id
            return (
              <div
                key={user.id}
                className="group bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-4 hover:border-slate-300 transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color}`}
                >
                  {initials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => remove.mutate(user.id)}
                  disabled={isRemoving}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 disabled:opacity-40 transition-all"
                >
                  {isRemoving ? "Removing…" : "Remove"}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
