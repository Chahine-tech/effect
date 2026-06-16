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

import { LoginPage } from "../pages/Login"
import { runApiResult } from "../lib/api"

const mockRunApiResult = vi.mocked(runApiResult)

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return React.createElement(QueryClientProvider, { client: qc }, children)
}

describe("LoginPage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders form fields and submit button", () => {
    render(React.createElement(LoginPage), { wrapper })
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("shows field error for invalid email without calling API", async () => {
    const user = userEvent.setup()
    render(React.createElement(LoginPage), { wrapper })

    await user.type(screen.getByPlaceholderText("you@example.com"), "a@b")
    await user.type(screen.getByPlaceholderText("••••••••"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument()
    expect(mockRunApiResult).not.toHaveBeenCalled()
  })

  it("shows field error for short password without calling API", async () => {
    const user = userEvent.setup()
    render(React.createElement(LoginPage), { wrapper })

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com")
    await user.type(screen.getByPlaceholderText("••••••••"), "short")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
    expect(mockRunApiResult).not.toHaveBeenCalled()
  })

  it("calls API with valid credentials", async () => {
    mockRunApiResult.mockResolvedValue({ _tag: "Ok", value: {} })
    const user = userEvent.setup()
    render(React.createElement(LoginPage), { wrapper })

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com")
    await user.type(screen.getByPlaceholderText("••••••••"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(mockRunApiResult).toHaveBeenCalledOnce()
  })

  it("shows error message on Unauthorized response", async () => {
    mockRunApiResult.mockResolvedValue({ _tag: "Err", error: { _tag: "Unauthorized", message: "Invalid credentials" } })
    const user = userEvent.setup()
    render(React.createElement(LoginPage), { wrapper })

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com")
    await user.type(screen.getByPlaceholderText("••••••••"), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    await screen.findByText("Invalid email or password")
  })
})
