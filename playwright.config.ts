/**
 * Playwright Configuration for WorldKit E2E Tests
 *
 * Configures Playwright to test the Electron application.
 * Uses electron-playwright-helpers for Electron-specific utilities.
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  retries: 0,
  workers: 1, // Electron tests must run serially
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Visual regression testing configuration
  expect: {
    toHaveScreenshot: {
      // Allow small anti-aliasing differences across platforms
      maxDiffPixelRatio: 0.05,
      // Threshold for color difference (0-1)
      threshold: 0.2,
      // Animation settling time
      animations: 'disabled',
    },
  },

  // Snapshot directory for visual baselines
  snapshotDir: './e2e/snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',

  // Start Vite dev server for the renderer before running tests
  webServer: {
    command: 'npm run dev:renderer',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
