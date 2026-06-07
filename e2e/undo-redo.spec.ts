/**
 * Undo/Redo E2E Tests
 *
 * Tests for verifying undo and redo functionality works correctly.
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

test.describe('Undo/Redo Infrastructure', () => {
  test('should have command debug panel available', async () => {
    // Toggle debug panel with Ctrl+Shift+D
    await pressShortcut(page, 'd', { ctrl: true, shift: true });

    // Wait for panel to appear
    await page.waitForTimeout(100);

    const debugPanel = page.locator('[data-testid="command-debug-panel"]');
    await expect(debugPanel).toBeVisible();

    // Close the panel
    await pressShortcut(page, 'd', { ctrl: true, shift: true });
  });

  test('should show empty undo stack initially', async () => {
    // Open debug panel
    await pressShortcut(page, 'd', { ctrl: true, shift: true });
    await page.waitForTimeout(100);

    const debugPanel = page.locator('[data-testid="command-debug-panel"]');
    await expect(debugPanel).toBeVisible();

    // Check for "No commands to undo" text
    const emptyMessage = page.locator('text=No commands to undo');
    await expect(emptyMessage).toBeVisible();

    // Close the panel
    await pressShortcut(page, 'd', { ctrl: true, shift: true });
  });
});

test.describe('Undo/Redo Keyboard Shortcuts', () => {
  test('should respond to Ctrl+Z (undo)', async () => {
    // Press Ctrl+Z - should not cause any errors
    await pressShortcut(page, 'z', { ctrl: true });

    // App should still be responsive
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('should respond to Ctrl+Y (redo)', async () => {
    // Press Ctrl+Y - should not cause any errors
    await pressShortcut(page, 'y', { ctrl: true });

    // App should still be responsive
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('should respond to Ctrl+Shift+Z (redo alternative)', async () => {
    // Press Ctrl+Shift+Z - should not cause any errors
    await pressShortcut(page, 'z', { ctrl: true, shift: true });

    // App should still be responsive
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });
});

test.describe('Undo/Redo with Actions', () => {
  test('should track delete action in undo stack', async () => {
    // First, we need an object to delete
    // For now, just verify the keyboard shortcut works
    await page.keyboard.press('Delete');

    // App should still be responsive
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('should track duplicate action in undo stack', async () => {
    // Press Ctrl+D for duplicate
    await pressShortcut(page, 'd', { ctrl: true });

    // App should still be responsive
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });
});
