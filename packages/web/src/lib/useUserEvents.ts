import { useEffect } from "react"
import { useRouter } from "@tanstack/react-router"

// Opens an SSE connection to /events and invalidates the router whenever
// a UserCreated or UserRemoved event arrives, keeping the users list in sync
// without polling.
export function useUserEvents() {
  const router = useRouter()

  useEffect(() => {
    const source = new EventSource("/events")

    const refresh = () => { router.invalidate() }
    source.addEventListener("UserCreated", refresh)
    source.addEventListener("UserRemoved", refresh)

    return () => { source.close() }
  }, [router])
}
