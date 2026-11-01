import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ["--no-sandbox"],
    },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
      },
  reporter: "list",
});
