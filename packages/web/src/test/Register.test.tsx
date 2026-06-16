import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { vi, describe, it, expect, beforeEach } from "vitest"
import React from "react"

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement("a", { href: String(to) }, children),
}))

vi.mock("../lib/api", () => ({
  runApiResult: vi.fn(),
}))

import { RegisterPage } from "../pages/Register"
import { runApiResult } from "../lib/api"

const mockRunApiResult = vi.mocked(runApiResult)

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return React.createElement(QueryClientProvider, { client: qc }, children)
}

describe("RegisterPage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders all form fields", () => {
    render(React.createElement(RegisterPage), { wrapper })
    expect(screen.getByPlaceholderText("Alice")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Min. 8 characters")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
  })

  it("shows field error for name exceeding 50 characters", async () => {
    const user = userEvent.setup()
    render(React.createElement(RegisterPage), { wrapper })

    await user.type(screen.getByPlaceholderText("Alice"), "a".repeat(51))
    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com")
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    expect(screen.getByText("Name must be between 1 and 50 characters")).toBeInTheDocument()
    expect(mockRunApiResult).not.toHaveBeenCalled()
  })

  it("shows field error for invalid email", async () => {
    const user = userEvent.setup()
    render(React.createElement(RegisterPage), { wrapper })

    await user.type(screen.getByPlaceholderText("Alice"), "Alice")
    await user.type(screen.getByPlaceholderText("you@example.com"), "a@b")
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument()
    expect(mockRunApiResult).not.toHaveBeenCalled()
  })

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup()
    render(React.createElement(RegisterPage), { wrapper })

    await user.type(screen.getByPlaceholderText("Alice"), "Alice")
    await user.type(screen.getByPlaceholderText("you@example.com"), "alice@example.com")
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password123")
    await user.type(screen.getByPlaceholderText("Repeat your password"), "different123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument()
    expect(mockRunApiResult).not.toHaveBeenCalled()
  })

  it("calls API twice on valid data (register + auto-login)", async () => {
    mockRunApiResult.mockResolvedValue({ _tag: "Ok", value: {} })
    const user = userEvent.setup()
    render(React.createElement(RegisterPage), { wrapper })

    await user.type(screen.getByPlaceholderText("Alice"), "Alice")
    await user.type(screen.getByPlaceholderText("you@example.com"), "alice@example.com")
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password123")
    await user.type(screen.getByPlaceholderText("Repeat your password"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    expect(mockRunApiResult).toHaveBeenCalledTimes(2)
  })

  it("shows error on email Conflict", async () => {
    mockRunApiResult.mockResolvedValue({ _tag: "Err", error: { _tag: "Conflict", message: "Email taken" } })
    const user = userEvent.setup()
    render(React.createElement(RegisterPage), { wrapper })

    await user.type(screen.getByPlaceholderText("Alice"), "Alice")
    await user.type(screen.getByPlaceholderText("you@example.com"), "alice@example.com")
    await user.type(screen.getByPlaceholderText("Min. 8 characters"), "password123")
    await user.type(screen.getByPlaceholderText("Repeat your password"), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await screen.findByText("Email already in use")
  })
})
