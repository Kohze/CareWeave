import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const localChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browserExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync(localChrome) ? localChrome : undefined);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
    launchOptions: browserExecutable ? { executablePath: browserExecutable } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: process.env.CLEARDAY_EXTERNAL_SERVER ? undefined : {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: 'ipad-landscape',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        hasTouch: true
      }
    },
    {
      name: 'ipad-portrait',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        hasTouch: true
      }
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1
      }
    }
  ]
});
