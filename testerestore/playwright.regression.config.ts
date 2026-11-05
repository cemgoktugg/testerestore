import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./tests/regression",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: { baseURL: "http://localhost:3101", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [ { name: "desktop", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["Pixel 5"] } } ],
  webServer: [
    { command: "node tests/fixtures/medusa.cjs", url: "http://127.0.0.1:9101/health", reuseExistingServer: false, timeout: 30000 },
    {
      command: "node node_modules/next/dist/bin/next dev --webpack -p 3101",
      url: "http://localhost:3101/iletisim", reuseExistingServer: false, timeout: 180000,
      env: {
        NEXT_DIST_DIR: ".next-regression", NEXT_TELEMETRY_DISABLED: "1",
        NEXT_FONT_GOOGLE_MOCKED_RESPONSES: path.resolve("tests/fixtures/fonts.cjs"),
        MEDUSA_BACKEND_URL: "http://127.0.0.1:9101", NEXT_PUBLIC_MEDUSA_BACKEND_URL: "http://127.0.0.1:9101",
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_regression", NEXT_PUBLIC_SITE_URL: "http://localhost:3101",
        NEXT_PUBLIC_DEFAULT_REGION: "tr", NEXT_PUBLIC_DEFAULT_CURRENCY: "try",
        NEXT_PUBLIC_GTM_ID: "", NEXT_PUBLIC_GA_ID: "", NEXT_PUBLIC_META_PIXEL_ID: "", NEXT_PUBLIC_YANDEX_METRIKA_ID: "",
        NEXT_PUBLIC_SENTRY_DSN: "", SENTRY_DSN: "", NEXT_PUBLIC_WHATSAPP_NUMBER: "",
      },
    },
  ],
});
