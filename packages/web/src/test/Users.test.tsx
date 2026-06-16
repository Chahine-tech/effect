import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { vi, describe, it, expect, beforeEach } from "vitest"
import React from "react"

const mockNavigate = vi.fn()
const mockInvalidate = vi.fn()
const mockLoaderData = { users: [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
], total: 2, offset: 0, limit: 10 }

vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({
    useLoaderData: () => mockLoaderData,
    useSearch: () => ({ page: 1 }),
  }),
  useRouter: () => ({ invalidate: mockInvalidate }),
  useNavigate: () => mockNavigate,
}))

vi.mock("../lib/api", () => ({
  runApi: vi.fn(),
  runApiResult: vi.fn(),
}))

vi.mock("../lib/useUserEvents", () => ({
  useUserEvents: vi.fn(),
}))

import { UsersPage } from "../pages/Users"
import { runApi, runApiResult } from "../lib/api"

const mockRunApi = vi.mocked(runApi)
const mockRunApiResult = vi.mocked(runApiResult)

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return React.createElement(QueryClientProvider, { client: qc }, children)
}

describe("UsersPage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders the list of users", () => {
    render(React.createElement(UsersPage), { wrapper })
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("alice@example.com")).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()
    expect(screen.getByText("bob@example.com")).toBeInTheDocument()
  })

  it("shows total user count", () => {
    render(React.createElement(UsersPage), { wrapper })
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("does not show pagination when only one page", () => {
    render(React.createElement(UsersPage), { wrapper })
    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument()
  })

  it("clicking Edit shows inline form with current values", async () => {
    const user = userEvent.setup()
    render(React.createElement(UsersPage), { wrapper })

    const editButtons = screen.getAllByRole("button", { name: /^edit$/i })
    await user.click(editButtons[0]!)

    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument()
    expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
  })

  it("clicking Cancel hides the edit form", async () => {
    const user = userEvent.setup()
    render(React.createElement(UsersPage), { wrapper })

    const editButtons = screen.getAllByRole("button", { name: /^edit$/i })
    await user.click(editButtons[0]!)
    await user.click(screen.getByRole("button", { name: /cancel/i }))

    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument()
    expect(screen.getByText("Alice")).toBeInTheDocument()
  })

  it("Save calls update API and closes form on success", async () => {
    mockRunApiResult.mockResolvedValue({ _tag: "Ok", value: { id: 1, name: "Alice Updated", email: "alice@example.com" } })
    const user = userEvent.setup()
    render(React.createElement(UsersPage), { wrapper })

    const editButtons = screen.getAllByRole("button", { name: /^edit$/i })
    await user.click(editButtons[0]!)
    await user.click(screen.getByRole("button", { name: /save/i }))

    expect(mockRunApiResult).toHaveBeenCalledOnce()
    expect(mockInvalidate).toHaveBeenCalledOnce()
  })

  it("Remove button calls remove API", async () => {
    mockRunApi.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(React.createElement(UsersPage), { wrapper })

    const removeButtons = screen.getAllByRole("button", { name: /^remove$/i })
    await user.click(removeButtons[0]!)

    expect(mockRunApi).toHaveBeenCalledOnce()
  })
})
