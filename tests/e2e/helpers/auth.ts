import { type Page, type APIRequestContext } from "@playwright/test";

export const BASE_URL = "http://localhost:18508";
export const API_URL = "http://localhost:8080";

export const ROLES = {
  administrator: { employeeId: "ADMIN001", password: "Admin@1234", role: "administrator" },
  document_controller: { employeeId: "DC001", password: "Password@123", role: "document_controller" },
  engineer: { employeeId: "ENG001", password: "Password@123", role: "engineer" },
  supervisor: { employeeId: "SUP001", password: "Password@123", role: "supervisor" },
  employee: { employeeId: "EMP001", password: "Password@123", role: "employee" },
  inspector: { employeeId: "INS001", password: "Password@123", role: "inspector" },
} as const;

export type RoleName = keyof typeof ROLES;

/**
 * Log in via the API and inject the token into localStorage,
 * then navigate to the given path. Fast path for page-load tests.
 */
export async function loginAs(
  page: Page,
  request: APIRequestContext,
  role: RoleName,
  path = "/dashboard"
): Promise<void> {
  const creds = ROLES[role];

  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: creds.employeeId, password: creds.password },
  });

  if (!response.ok()) {
    throw new Error(
      `Login failed for ${role}: ${response.status()} ${await response.text()}`
    );
  }

  const { token } = await response.json();

  // Set localStorage on the target origin before navigating to the protected page
  await page.goto(BASE_URL + "/login");
  await page.evaluate((t: string) => {
    localStorage.setItem("edocs_token", t);
  }, token);

  await page.goto(BASE_URL + path);
}

/**
 * Perform a full UI login through the login form.
 * Returns once the app has navigated to /dashboard and the token is saved.
 * The login page calls setLocation("/dashboard") on success.
 */
export async function uiLoginAs(
  page: Page,
  role: RoleName
): Promise<string> {
  const creds = ROLES[role];
  await page.goto(BASE_URL + "/login");
  await page.getByLabel(/employee id/i).fill(creds.employeeId);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /login to terminal/i }).click();

  // Login navigates to /dashboard on success
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  // Return the token saved in localStorage so callers can assert on it
  const token = await page.evaluate(() => localStorage.getItem("edocs_token"));
  if (!token) throw new Error(`No token found in localStorage after login for ${role}`);
  return token;
}

/**
 * Collect browser console errors (ignoring known benign ones).
 *
 * Filtered out:
 * - React DevTools download notice
 * - Vite HMR messages
 * - favicon 404s
 * - Generic "Failed to load resource: 404" messages — these come from
 *   Replit Vite dev plugins (cartographer, dev-banner) whose requests are
 *   proxied to the API server which has no matching route. They are dev-only
 *   and do not indicate an application bug.
 * - We still catch 403 errors because those indicate real access-control failures.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();

      // Known-benign dev environment noise
      if (text.includes("Download the React DevTools")) return;
      if (text.includes("[vite]")) return;
      if (text.includes("favicon")) return;

      // Non-critical 404s from Vite dev-tool requests proxied to the API server.
      // The error text format is: "Failed to load resource: the server responded
      // with a status of 404 ()" — we match on the status code, not the URL,
      // because Playwright omits the URL from msg.text().
      if (
        text.includes("Failed to load resource") &&
        text.includes("404")
      ) return;

      errors.push(text);
    }
  });
  return errors;
}
