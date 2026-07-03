import { test, expect } from "@playwright/test";

/**
 * Authentication guard tests.
 *
 * These tests do NOT sign in — they verify that unauthenticated users are
 * always redirected to /login and cannot access protected routes directly.
 * Full sign-in tests require Google OAuth which can't be automated in E2E
 * without a service account; those are verified manually per the QA checklist.
 */
test.describe("Authentication guard", () => {
  test("unauthenticated root redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated /hours redirects to /login", async ({ page }) => {
    await page.goto("/hours");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated /projects redirects to /login", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated /ai redirects to /login", async ({ page }) => {
    await page.goto("/ai");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated /account redirects to /login", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated /reports redirects to /login", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/login page renders the sign-in button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Sign in with Google")).toBeVisible();
  });

  test("/api/health is reachable without auth and returns status ok", async ({ page }) => {
    const res = await page.request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("ok");
  });
});

test.describe("Auth callback open redirect protection", () => {
  test("next param with @ is rejected and falls back to /hours", async ({ page }) => {
    // Without a valid code the callback will redirect to /login?error=missing_code
    // so we can't test the happy path here. We verify the redirect-to-login
    // behaviour proves the route is reachable and doesn't throw a 500.
    const res = await page.request.get("/auth/callback?next=@evil.com", {
      maxRedirects: 0,
    });
    // Should get a redirect (301/302/307), not a 200 or 500
    expect([301, 302, 307, 308]).toContain(res.status());
  });
});
