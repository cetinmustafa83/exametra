import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-tests",
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: process.env.DYAD_TEST_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:32104",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.DYAD_TEST_BASE_URL
    ? undefined
    : {
        command: "pnpm start --hostname 127.0.0.1 --port 32104",
        url: "http://127.0.0.1:32104",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
