import { Metric } from "effect"

export const registrationsTotal = Metric.counter("registrations_total", {
  description: "Total user registrations",
})

export const loginsTotal = Metric.counter("logins_total", {
  description: "Total successful logins",
})

export const authFailuresTotal = Metric.counter("auth_failures_total", {
  description: "Total authentication failures",
})
