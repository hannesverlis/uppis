import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
  },
  webServer: {
    command: "npx next dev -p 3100",
    port: 3100,
    reuseExistingServer: false,
    env: {
      UPPIS_DB_FILE: "data/e2e-db.json",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
