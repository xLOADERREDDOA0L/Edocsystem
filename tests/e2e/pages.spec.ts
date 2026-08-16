import { test, expect } from "@playwright/test";
import {
  loginAs,
  collectConsoleErrors,
  ROLES,
  BASE_URL,
  type RoleName,
} from "./helpers/auth";

// ─── Role capabilities ────────────────────────────────────────────────────────
const REPORT_ROLES: RoleName[] = ["administrator", "document_controller", "supervisor"];
const AUDIT_ROLES: RoleName[] = ["administrator", "document_controller"];

/**
 * Core pages that every authenticated role must be able to load
 * without console errors.
 */
const UNIVERSAL_PAGES: Array<{ path: string; heading: RegExp }> = [
  { path: "/dashboard", heading: /terminal overview/i },
  { path: "/documents", heading: /document library/i },
  { path: "/requests", heading: /document requests/i },
  { path: "/print", heading: /print control room/i },
  { path: "/print-history", heading: /print history/i },
  { path: "/settings", heading: /profile settings/i },
];

/** Pages accessible only to report-authorized roles. */
const REPORTS_PAGE = { path: "/reports", heading: /analytics & reports/i };

/** Pages accessible only to audit-authorized roles. */
const AUDIT_PAGE = { path: "/audit", heading: /audit trail/i };

// ── Universal pages (all roles) ───────────────────────────────────────────────
for (const roleName of Object.keys(ROLES) as RoleName[]) {
  test.describe(`Role: ${roleName}`, () => {
    for (const { path, heading } of UNIVERSAL_PAGES) {
      test(`${path} loads without console errors`, async ({ page, request }) => {
        const errors = collectConsoleErrors(page);
        await loginAs(page, request, roleName, path);
        await expect(page.getByRole("heading", { name: heading })).toBeVisible({
          timeout: 15_000,
        });
        await page.waitForTimeout(500);
        expect(
          errors,
          `Console errors on ${path} for ${roleName}: ${errors.join("; ")}`
        ).toHaveLength(0);
      });
    }
  });
}

// ── Reports page (restricted roles) ──────────────────────────────────────────
for (const roleName of REPORT_ROLES) {
  test(`Role: ${roleName} › /reports loads without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, REPORTS_PAGE.path);
    await expect(
      page.getByRole("heading", { name: REPORTS_PAGE.heading })
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    expect(
      errors,
      `Console errors on /reports for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

// ── Audit Trail page (restricted roles) ──────────────────────────────────────
for (const roleName of AUDIT_ROLES) {
  test(`Role: ${roleName} › /audit loads without console errors`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, AUDIT_PAGE.path);
    await expect(
      page.getByRole("heading", { name: AUDIT_PAGE.heading })
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    expect(
      errors,
      `Console errors on /audit for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

// ── Restricted roles see "Access Restricted" instead of 403 errors ────────────
const NON_REPORT_ROLES = (Object.keys(ROLES) as RoleName[]).filter(
  (r) => !REPORT_ROLES.includes(r)
);
const NON_AUDIT_ROLES = (Object.keys(ROLES) as RoleName[]).filter(
  (r) => !AUDIT_ROLES.includes(r)
);

for (const roleName of NON_REPORT_ROLES) {
  test(`Role: ${roleName} › /reports shows access-restricted message (no 403 errors)`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/reports");
    // Page should show an access-restricted message, not a 403 console error
    await expect(page.getByText(/access restricted/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(500);
    expect(
      errors,
      `Console errors on /reports for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}

for (const roleName of NON_AUDIT_ROLES) {
  test(`Role: ${roleName} › /audit shows access-restricted message (no 403 errors)`, async ({
    page,
    request,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAs(page, request, roleName, "/audit");
    await expect(page.getByText(/access restricted/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(500);
    expect(
      errors,
      `Console errors on /audit for ${roleName}: ${errors.join("; ")}`
    ).toHaveLength(0);
  });
}
