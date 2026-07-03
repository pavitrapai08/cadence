import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 * Tests require a running Next.js dev server and a seeded Supabase instance.
 * Set TEST_BASE_URL to override the default localhost:3000.
 *
 * Run:  npx playwright test
 * UI:   npx playwright test --ui
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  timeout: 30_000,

  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start the dev server automatically when running tests locally.
  // In CI, start the server separately before running `playwright test`.
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
