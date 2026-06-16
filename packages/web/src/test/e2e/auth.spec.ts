import { test, expect } from "@playwright/test"

const uniq = () => `e2e-${Date.now()}@test.com`

test.describe("Auth + Users flow", () => {
  test("register → users list → edit → logout", async ({ page }) => {
    const email = uniq()
    const password = "password123"

    // Register
    await page.goto("/register")
    await page.fill('[placeholder="Alice"]', "E2E User")
    await page.fill('[placeholder="you@example.com"]', email)
    await page.fill('[placeholder="Min. 8 characters"]', password)
    await page.fill('[placeholder="Repeat your password"]', password)
    await page.click('button[type="submit"]')

    // Should land on /users
    await expect(page).toHaveURL(/\/users/)
    await expect(page.getByText("E2E User")).toBeVisible()

    // Edit the user
    await page.getByText("E2E User").hover()
    await page.getByRole("button", { name: "Edit" }).first().click()

    const nameInput = page.getByPlaceholder("Name").first()
    await nameInput.clear()
    await nameInput.fill("E2E Updated")
    await page.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("E2E Updated")).toBeVisible()

    // Logout
    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL("/login")
  })

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login")
    await page.fill('[placeholder="you@example.com"]', "nobody@example.com")
    await page.fill('[placeholder="••••••••"]', "wrongpassword")
    await page.click('button[type="submit"]')

    await expect(page.getByText("Invalid email or password")).toBeVisible()
  })

  test("invalid email shows inline error without calling API", async ({ page }) => {
    await page.goto("/login")
    await page.fill('[placeholder="you@example.com"]', "notanemail")
    await page.fill('[placeholder="••••••••"]', "password123")
    await page.click('button[type="submit"]')

    await expect(page.getByText("Please enter a valid email address")).toBeVisible()
  })

  test("passwords mismatch shows inline error", async ({ page }) => {
    await page.goto("/register")
    await page.fill('[placeholder="Alice"]', "Alice")
    await page.fill('[placeholder="you@example.com"]', uniq())
    await page.fill('[placeholder="Min. 8 characters"]', "password123")
    await page.fill('[placeholder="Repeat your password"]', "different456")
    await page.click('button[type="submit"]')

    await expect(page.getByText("Passwords do not match")).toBeVisible()
  })

  test("unauthenticated /users redirects to /login", async ({ page }) => {
    await page.goto("/users")
    await expect(page).toHaveURL("/login")
  })
})
