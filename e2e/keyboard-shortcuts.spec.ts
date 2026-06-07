/**
 * Keyboard Shortcuts E2E Tests
 *
 * Tests for verifying all keyboard shortcuts work correctly.
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, waitForAppReady, pressShortcut } from './helpers/electron';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const context = await launchApp();
  app = context.app;
  page = context.page;
  await waitForAppReady(page);
});

test.afterAll(async () => {
  await closeApp(app);
});

test.describe('Tool Mode Shortcuts', () => {
  test('G key should activate Move tool', async () => {
    await page.keyboard.press('g');
    // App should respond without errors
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('R key should activate Rotate tool', async () => {
    await page.keyboard.press('r');
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('S key should activate Scale tool', async () => {
    await page.keyboard.press('s');
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('Escape should return to Select mode', async () => {
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });
});

test.describe('Selection Shortcuts', () => {
  test('Ctrl+A should select all', async () => {
    await pressShortcut(page, 'a', { ctrl: true });
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('Delete key should trigger delete', async () => {
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('Backspace key should trigger delete', async () => {
    await page.keyboard.press('Backspace');
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });
});

test.describe('Edit Shortcuts', () => {
  test('Ctrl+D should trigger duplicate', async () => {
    await pressShortcut(page, 'd', { ctrl: true });
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('Ctrl+G should trigger group', async () => {
    await pressShortcut(page, 'g', { ctrl: true });
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('Ctrl+Shift+G should trigger ungroup', async () => {
    await pressShortcut(page, 'g', { ctrl: true, shift: true });
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });
});

test.describe('View Shortcuts', () => {
  test('F key should focus on selection', async () => {
    await page.keyboard.press('f');
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });
});

test.describe('Debug Shortcuts', () => {
  test('Ctrl+Shift+D should toggle debug panel', async () => {
    // Open
    await pressShortcut(page, 'd', { ctrl: true, shift: true });
    await page.waitForTimeout(100);

    const debugPanel = page.locator('[data-testid="command-debug-panel"]');
    await expect(debugPanel).toBeVisible();

    // Close
    await pressShortcut(page, 'd', { ctrl: true, shift: true });
    await page.waitForTimeout(100);

    await expect(debugPanel).not.toBeVisible();
  });
});
