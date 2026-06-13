import { HttpApiBuilder, HttpServerResponse } from "@effect/platform"
import { Effect, PubSub, Schedule, Stream } from "effect"
import { UserEventBus } from "../../infrastructure/events.js"

const encoder = new TextEncoder()

const eventsEffect = Effect.gen(function* () {
  const bus = yield* UserEventBus

  const events = Stream.unwrapScoped(
    Effect.gen(function* () {
      const queue = yield* PubSub.subscribe(bus)
      return Stream.fromQueue(queue).pipe(
        Stream.map((event) => {
          const msg = `event: ${event._tag}\ndata: ${JSON.stringify(event)}\n\n`
          return encoder.encode(msg)
        })
      )
    })
  )

  // Send a comment every 30s to keep the connection alive through proxies
  const keepalive = Stream.fromSchedule(Schedule.fixed("30 seconds")).pipe(
    Stream.as(encoder.encode(": keepalive\n\n"))
  )

  return HttpServerResponse.stream(Stream.merge(events, keepalive), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
})

export const EventsHandlerLive = HttpApiBuilder.Router.use((router) =>
  router.get("/events", eventsEffect)
)
