// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Read from default ".env" file.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60000,
  use: {
    baseURL: process.env.BASE_URL || 'https://stage.crexagent.com',
    trace: 'on',
    screenshot: 'only-on-failure',
    headless: false,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.js/ },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
