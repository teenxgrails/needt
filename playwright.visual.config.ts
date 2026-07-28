import { defineConfig } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 120_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
    },
  },
  globalSetup: "./tests/visual/global-setup.ts",
  globalTeardown: "./tests/visual/global-teardown.ts",
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  use: {
    baseURL,
    colorScheme: "dark",
    locale: "en-US",
    timezoneId: "Europe/Zurich",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "tablet",
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "mobile",
      use: { viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    // Keep visual CI on webpack: Next 15.3 Turbopack can terminate the dev
    // server when BullMQ/ioredis are resolved through serverExternalPackages.
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXTAUTH_URL: baseURL,
      NEXTAUTH_SECRET:
        process.env.NEXTAUTH_SECRET || "needt-visual-regression-secret",
    },
  },
});
