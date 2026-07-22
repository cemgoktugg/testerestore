import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

/**
 * Playwright config — E2E critical path coverage.
 *
 * Çalıştırma:
 *   npm run test:e2e
 *   npm run test:e2e -- --ui      (interactive UI mode)
 *   npm run test:e2e:headed       (browser görünür)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Test öncesi dev server'ı otomatik başlat — CI dışı geliştirme için
  // CI'da harici docker-compose ile başlatılması daha güvenli.
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        port: 3001,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
