import { useState } from "react"
import { getRouteApi, useNavigate, useRouter } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import type { User } from "@myapp/contract"
import { runApi, runApiResult } from "../lib/api"
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
  const { users, total, limit } = routeApi.useLoaderData()
  const { page } = routeApi.useSearch()
  const router = useRouter()
  const navigate = useNavigate({ from: "/users" })
  useUserEvents()

  const totalPages = Math.ceil(total / limit)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditName(user.name)
    setEditEmail(user.email)
  }

  const cancelEdit = () => setEditingId(null)

  const remove = useMutation({
    mutationFn: (id: number) => runApi((c) => c.users.remove({ path: { id } })),
    onSuccess: () => {
      toast.success("User removed")
      router.invalidate()
    },
    onError: () => toast.error("Failed to remove user"),
  })

  const update = useMutation({
    mutationFn: ({ id, name, email }: { id: number; name: string; email: string }) =>
      runApiResult((c) => c.users.update({ path: { id }, payload: { name, email } })),
    onSuccess: (result) => {
      if (result._tag === "Ok") {
        toast.success("User updated")
        setEditingId(null)
        router.invalidate()
      } else {
        toast.error(result.error._tag === "Conflict" ? "Email already in use" : "Failed to update user")
      }
    },
    onError: () => toast.error("Failed to update user"),
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
          {total}
        </span>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No users yet.</div>
      ) : (
        <div className="grid gap-2">
          {users.map((user) => {
            const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length]
            const isRemoving = remove.isPending && remove.variables === user.id
            const isEditing = editingId === user.id

            return (
              <div
                key={user.id}
                className="group bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 transition-colors"
              >
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color}`}>
                      {initials(editName || user.name)}
                    </div>
                    <div className="flex-1 flex gap-2 min-w-0">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Email"
                        className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => update.mutate({ id: user.id, name: editName, email: editEmail })}
                        disabled={update.isPending}
                        className="text-xs bg-slate-900 text-white px-3 py-1 rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors"
                      >
                        {update.isPending ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color}`}>
                      {initials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => startEdit(user)}
                        className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove.mutate(user.id)}
                        disabled={isRemoving}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md disabled:opacity-40 transition-colors"
                      >
                        {isRemoving ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => navigate({ search: { page: page - 1 } })}
            disabled={page <= 1}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => navigate({ search: { page: page + 1 } })}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
