import { test, expect } from "@playwright/test";
import { loginAs, BASE_URL, type RoleName } from "./helpers/auth";

/**
 * Roles allowed to see Approve/Reject actions on the Requests page.
 */
const APPROVER_ROLES: RoleName[] = ["administrator", "document_controller", "supervisor"];

/**
 * Roles that must NOT see Approve/Reject actions.
 */
const NON_APPROVER_ROLES: RoleName[] = ["engineer", "employee", "inspector"];

// ─── Admin panel ────────────────────────────────────────────────────────────

test.describe("Admin panel visibility", () => {
  test("administrator sees Administration section in sidebar", async ({
    page,
    request,
  }) => {
    await loginAs(page, request, "administrator", "/dashboard");
    // The sidebar Administration heading should be visible
    await expect(page.locator("aside").getByText("Administration")).toBeVisible();
    // Admin nav links
    await expect(page.locator("aside").getByRole("link", { name: /^Users$/ })).toBeVisible();
    await expect(
      page.locator("aside").getByRole("link", { name: /^Departments$/ })
    ).toBeVisible();
    await expect(
      page.locator("aside").getByRole("link", { name: /^Categories$/ })
    ).toBeVisible();
  });

  for (const roleName of ([
    "document_controller",
    "engineer",
    "supervisor",
    "employee",
    "inspector",
  ] as RoleName[])) {
    test(`${roleName} does NOT see Administration section in sidebar`, async ({
      page,
      request,
    }) => {
      await loginAs(page, request, roleName, "/dashboard");
      const adminSection = page.locator("aside").getByText("Administration");
      await expect(adminSection).toHaveCount(0);
    });
  }

  test("administrator can load /admin/users page", async ({ page, request }) => {
    await loginAs(page, request, "administrator", "/admin/users");
    await expect(
      page.getByRole("heading", { name: /user management/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("administrator can load /admin/departments page", async ({
    page,
    request,
  }) => {
    await loginAs(page, request, "administrator", "/admin/departments");
    await expect(
      page.getByRole("heading", { name: /departments/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("administrator can load /admin/categories page", async ({
    page,
    request,
  }) => {
    await loginAs(page, request, "administrator", "/admin/categories");
    await expect(
      page.getByRole("heading", { name: /categories/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Approve / Reject buttons ────────────────────────────────────────────────

test.describe("Approve/Reject button visibility on Requests page", () => {
  /**
   * Approvers see an "Actions" column header in the Pending Approval tab.
   * We click the "PENDING APPROVAL" tab and check for the Actions column.
   */
  for (const roleName of APPROVER_ROLES) {
    test(`${roleName} sees Actions column (Approve/Reject) on Pending Approval tab`, async ({
      page,
      request,
    }) => {
      await loginAs(page, request, roleName, "/requests");
      await expect(
        page.getByRole("heading", { name: /document requests/i })
      ).toBeVisible({ timeout: 15_000 });

      // Click the Pending Approval tab
      await page.getByRole("tab", { name: /pending approval/i }).click();
      await page.waitForTimeout(500);

      // The Actions column header is only rendered when showActions=true
      await expect(
        page.getByRole("columnheader", { name: /actions/i })
      ).toBeVisible({ timeout: 5_000 });
    });
  }

  for (const roleName of NON_APPROVER_ROLES) {
    test(`${roleName} does NOT see Actions column on Pending Approval tab`, async ({
      page,
      request,
    }) => {
      await loginAs(page, request, roleName, "/requests");
      await expect(
        page.getByRole("heading", { name: /document requests/i })
      ).toBeVisible({ timeout: 15_000 });

      // Click the Pending Approval tab
      await page.getByRole("tab", { name: /pending approval/i }).click();
      await page.waitForTimeout(500);

      // The Actions column header must NOT be present for non-approvers
      await expect(
        page.getByRole("columnheader", { name: /actions/i })
      ).toHaveCount(0);
    });
  }
});
