import { test, expect } from "@playwright/test";

/**
 * API security tests — no authenticated session needed.
 * These verify that unauthenticated callers receive 401/403, not data.
 */
test.describe("API authentication enforcement", () => {
  const protectedRoutes = [
    { method: "GET", path: "/api/entries" },
    { method: "GET", path: "/api/projects" },
    { method: "GET", path: "/api/admin/users" },
    { method: "GET", path: "/api/admin/clients" },
    { method: "GET", path: "/api/admin/tag-groups" },
    { method: "GET", path: "/api/reports/clients" },
    { method: "GET", path: "/api/reports/timesheets" },
    { method: "GET", path: "/api/account/profile" },
  ];

  for (const { method, path } of protectedRoutes) {
    test(`${method} ${path} returns 401 without session`, async ({ request }) => {
      const res = await request.fetch(path, { method, failOnStatusCode: false });
      expect(res.status()).toBe(401);
    });
  }
});

test.describe("Admin-only route enforcement", () => {
  // These return 401 (no session) which is strictly correct — 403 would require
  // a session. The important thing is they never return 200 + data.
  const adminRoutes = [
    { method: "POST", path: "/api/projects", body: { name: "test" } },
    { method: "POST", path: "/api/admin/clients", body: { name: "test" } },
  ];

  for (const { method, path, body } of adminRoutes) {
    test(`${method} ${path} is not publicly accessible`, async ({ request }) => {
      const res = await request.fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        data: body,
        failOnStatusCode: false,
      });
      expect([401, 403]).toContain(res.status());
    });
  }
});

test.describe("CRON endpoint security", () => {
  test("POST /api/cron/missing-hours without secret returns 403", async ({ request }) => {
    const res = await request.post("/api/cron/missing-hours", {
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/cron/missing-hours with wrong secret returns 403", async ({ request }) => {
    const res = await request.post("/api/cron/missing-hours", {
      headers: { "x-cron-secret": "definitely-wrong-secret" },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(403);
  });

  test("secret via query param is NOT accepted (header-only)", async ({ request }) => {
    // Even if someone guesses the secret, query-param delivery must be rejected
    const res = await request.post(
      "/api/cron/missing-hours?secret=generate-a-long-random-string",
      { failOnStatusCode: false }
    );
    expect(res.status()).toBe(403);
  });
});
