import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

/**
 * The /verify/:token page must be publicly accessible without authentication.
 */
test.describe("/verify/:token page", () => {
  test("loads without authentication", async ({ page }) => {
    // Ensure no token is present
    await page.goto(BASE_URL + "/login");
    await page.evaluate(() => localStorage.removeItem("edocs_token"));

    // Navigate directly to a verify URL with a dummy token
    await page.goto(BASE_URL + "/verify/test-token-123");

    // Should NOT redirect to login — the page should render something
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("verify page does not show login form", async ({ page }) => {
    // Ensure no auth
    await page.goto(BASE_URL + "/login");
    await page.evaluate(() => localStorage.removeItem("edocs_token"));

    await page.goto(BASE_URL + "/verify/abc-xyz-token");
    await page.waitForTimeout(2000);

    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);

    // Login form elements should NOT be present on this page
    await expect(page.getByLabel(/employee id/i)).toHaveCount(0);
  });
});
