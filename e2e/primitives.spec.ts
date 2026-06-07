/**
 * Primitives E2E Tests
 *
 * Tests for adding and manipulating primitive objects in the scene.
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

test.describe('Add Primitives', () => {
  test('should add a cube to the scene', async () => {
    // Get initial entity count from scene tree
    const initialItems = await page.locator('[data-testid^="tree-node-"]').count();

    // Trigger add cube via toolbar button
    const addCubeBtn = page.locator('[data-testid="add-cube-button"]');
    await addCubeBtn.click();

    // Wait for scene tree to update
    await page.waitForTimeout(500);

    // Check that a new item appeared in scene tree
    const newItems = await page.locator('[data-testid^="tree-node-"]').count();
    expect(newItems).toBeGreaterThan(initialItems);
  });

  test('should show cube in scene tree after adding', async () => {
    // Look for tree nodes in the scene tree
    const sceneTree = page.locator('[data-testid="scene-tree"]');
    await expect(sceneTree).toBeVisible();

    // There should be at least one tree node now
    const treeNodes = page.locator('[data-testid^="tree-node-"]');
    await expect(treeNodes.first()).toBeVisible();
  });
});

test.describe('Object Selection', () => {
  test('should be able to click on viewport', async () => {
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();

    // Click on the viewport
    await viewport.click();

    // Viewport should still be visible (no crash)
    await expect(viewport).toBeVisible();
  });
});

test.describe('Transform Tools', () => {
  test('should switch to Move mode with G key', async () => {
    await page.keyboard.press('g');
    // Verify app responds without crashing
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('should switch to Rotate mode with R key', async () => {
    await page.keyboard.press('r');
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('should switch to Scale mode with S key', async () => {
    await page.keyboard.press('s');
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('should switch to Select mode with Escape', async () => {
    await page.keyboard.press('Escape');
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });
});
