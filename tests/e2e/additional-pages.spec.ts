/**
 * Additional page coverage: routes not covered by pages.spec.ts.
 *
 * Covers:
 *  - /documents/new
 *  - /requests/new
 *  - /change-password
 *  - /documents/:id  (uses a document created via API in beforeAll)
 *  - /revisions/new/:documentId
 *  - /admin/users, /admin/departments, /admin/categories
 *    verified for both allowed AND restricted roles
 */

import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  loginAs,
  collectConsoleErrors,
  ROLES,
  BASE_URL,
  API_URL,
  type RoleName,
} from "./helpers/auth";

// ─── Test fixture: create a document via API so detail/revision pages have
//     a real record to render. ───────────────────────────────────────────────
let testDocumentId = 0;

async function ensureTestDocument(request: APIRequestContext): Promise<number> {
  if (testDocumentId) return testDocumentId;

  // Authenticate as administrator
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: ROLES.administrator.employeeId, password: ROLES.administrator.password },
  });
  const { token } = await loginRes.json();

  // Fetch existing documents first — reuse if one already exists
  const listRes = await request.get(`${API_URL}/api/documents?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listBody = await listRes.json();
  if (listBody?.data?.length > 0) {
    testDocumentId = listBody.data[0].id;
    return testDocumentId;
  }

  // Create a document
  const createRes = await request.post(`${API_URL}/api/documents`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: {
      documentNumber: `TEST-${Date.now()}`,
      title: "E2E Test Document",
      description: "Created by Playwright for page-load tests",
    },
  });

  if (!createRes.ok()) {
    throw new Error(`Failed to create test document: ${createRes.status()} ${await createRes.text()}`);
  }

  const created = await createRes.json();
  testDocumentId = created.id;
  return testDocumentId;
}

// ─── Form pages available to every authenticated role ────────────────────────
const ALL_ROLES = Object.keys(ROLES) as RoleName[];

for (const roleName of ALL_ROLES) {
  test(`Role: ${roleName} › /documents/new loads without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/documents/new");
    await expect(
      page.getByRole("heading", { name: /register document/i })
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /documents/new for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });

  test(`Role: ${roleName} › /requests/new loads without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/requests/new");
    await expect(
      page.getByRole("heading", { name: /request document/i })
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /requests/new for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });

  test(`Role: ${roleName} › /change-password loads without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/change-password");
    await expect(page.getByText(/change password/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /change-password for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

// ─── Document detail + revision pages (need a real document ID) ───────────────
for (const roleName of ALL_ROLES) {
  test(`Role: ${roleName} › /documents/:id loads without console errors`, async ({
    page,
    request,
  }) => {
    const docId = await ensureTestDocument(request);
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, `/documents/${docId}`);
    // Page shows either the document title or a "Document not found" message —
    // either way the page rendered without a crash.
    await expect(
      page.locator("h1, [role='heading']").first()
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /documents/${docId} for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });

  test(`Role: ${roleName} › /revisions/new/:documentId loads without console errors`, async ({
    page,
    request,
  }) => {
    const docId = await ensureTestDocument(request);
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, `/revisions/new/${docId}`);
    await expect(
      page.getByRole("heading", { name: /upload revision/i })
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /revisions/new/${docId} for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

// ─── Admin pages: allowed roles see content; restricted roles see guard ────────

// /admin/users — accessible to administrator, document_controller, supervisor
const USERS_ALLOWED: RoleName[] = ["administrator", "document_controller", "supervisor"];
const USERS_RESTRICTED = ALL_ROLES.filter((r) => !USERS_ALLOWED.includes(r));

for (const roleName of USERS_ALLOWED) {
  test(`Role: ${roleName} › /admin/users loads user management without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/admin/users");
    await expect(
      page.getByRole("heading", { name: /user management/i })
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /admin/users for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}
for (const roleName of USERS_RESTRICTED) {
  test(`Role: ${roleName} › /admin/users shows access-restricted (not a crash)`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/admin/users");
    await expect(page.getByText(/access restricted/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /admin/users for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

// /admin/departments — only administrator
const DEPTS_ALLOWED: RoleName[] = ["administrator"];
const DEPTS_RESTRICTED = ALL_ROLES.filter((r) => !DEPTS_ALLOWED.includes(r));

for (const roleName of DEPTS_ALLOWED) {
  test(`Role: ${roleName} › /admin/departments loads without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/admin/departments");
    await expect(
      page.getByRole("heading", { name: /departments/i })
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /admin/departments for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}
for (const roleName of DEPTS_RESTRICTED) {
  test(`Role: ${roleName} › /admin/departments shows access-restricted`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/admin/departments");
    await expect(page.getByText(/access restricted/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /admin/departments for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

// / (root) — all authenticated roles are redirected to /dashboard
for (const roleName of ALL_ROLES) {
  test(`Role: ${roleName} › / redirects to /dashboard without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/");
    // Root redirects to dashboard
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /terminal overview/i })
    ).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on / for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

// /admin/users/new — only administrator
test(`Role: administrator › /admin/users/new loads without console errors`, async ({
  page,
  request,
}) => {
  const errors = collectConsoleErrors(page);
  await loginAs(page, request, "administrator", "/admin/users/new");
  await expect(
    page.getByRole("heading", { name: /register user/i })
  ).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(400);
  expect(
    errors,
    `Console errors on /admin/users/new for administrator: ${errors.join("; ")}`
  ).toHaveLength(0);
});

for (const roleName of ALL_ROLES.filter((r) => r !== "administrator")) {
  test(`Role: ${roleName} › /admin/users/new shows access-restricted`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/admin/users/new");
    await expect(page.getByText(/access restricted/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /admin/users/new for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

// /admin/categories — administrator and document_controller
const CATS_ALLOWED: RoleName[] = ["administrator", "document_controller"];
const CATS_RESTRICTED = ALL_ROLES.filter((r) => !CATS_ALLOWED.includes(r));

for (const roleName of CATS_ALLOWED) {
  test(`Role: ${roleName} › /admin/categories loads without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/admin/categories");
    await expect(
      page.getByRole("heading", { name: /categories/i })
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /admin/categories for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}
for (const roleName of CATS_RESTRICTED) {
  test(`Role: ${roleName} › /admin/categories shows access-restricted`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/admin/categories");
    await expect(page.getByText(/access restricted/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(400);
    expect(
      errors,
      `Console errors on /admin/categories for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}
