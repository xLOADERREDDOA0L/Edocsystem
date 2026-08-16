import { test, expect } from "@playwright/test";
import { ROLES, uiLoginAs, loginAs, BASE_URL, type RoleName } from "./helpers/auth";

/**
 * Verifies the full UI login flow works for every role:
 * - Form fills correctly
 * - API call succeeds
 * - Success toast is shown
 * - JWT token is persisted in localStorage
 */
for (const roleName of Object.keys(ROLES) as RoleName[]) {
  test(`UI login succeeds for role: ${roleName}`, async ({ page }) => {
    const token = await uiLoginAs(page, roleName);

    // Token must be a non-empty JWT string
    expect(token).toBeTruthy();
    expect(token.split(".").length).toBe(3); // header.payload.signature

    // After login the app navigates to /dashboard
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
}

test("after UI login, navigating to /dashboard shows dashboard", async ({
  page,
  request,
}) => {
  // Use API login and localStorage inject for speed — this just tests the dashboard renders
  await loginAs(page, request, "administrator", "/dashboard");
  await expect(
    page.getByRole("heading", { name: /terminal overview/i })
  ).toBeVisible({ timeout: 15_000 });
});

test("Login page is accessible without auth", async ({ page }) => {
  await page.goto(BASE_URL + "/login");
  await expect(page.getByRole("heading", { name: /edocs control/i })).toBeVisible();
  await expect(page.getByLabel(/employee id/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test("Unauthenticated access to dashboard redirects to login", async ({ page }) => {
  // Ensure no token
  await page.goto(BASE_URL + "/login");
  await page.evaluate(() => localStorage.removeItem("edocs_token"));

  await page.goto(BASE_URL + "/dashboard");
  await page.waitForURL("**/login", { timeout: 10_000 });
  await expect(page).toHaveURL(/\/login/);
});

test("Invalid credentials show error toast", async ({ page }) => {
  await page.goto(BASE_URL + "/login");
  await page.getByLabel(/employee id/i).fill("INVALID999");
  await page.getByLabel(/password/i).fill("wrongpassword");
  await page.getByRole("button", { name: /login to terminal/i }).click();

  await expect(page.getByText(/authentication failed/i)).toBeVisible({ timeout: 10_000 });
});
