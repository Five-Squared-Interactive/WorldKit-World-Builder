/**
 * Layout E2E Tests
 *
 * Tests that verify UI layout contracts:
 * - Panel sizing and constraints
 * - Resizable panel behavior
 * - No unexpected overflow/scrollbars
 * - Icon rendering
 *
 * These tests catch visual/layout bugs that unit tests miss.
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchApp, closeApp, waitForAppReady } from './helpers/electron';

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

test.describe('Panel Layout Contracts', () => {
  test('scene tree panel has reasonable default width', async () => {
    const panel = page.locator('[data-testid="scene-tree"]');
    const box = await panel.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      // Should be at least 150px wide (usable) and less than 50% of viewport
      expect(box.width).toBeGreaterThanOrEqual(150);
      expect(box.width).toBeLessThanOrEqual(800);
    }
  });

  test('properties panel has reasonable default width', async () => {
    const panel = page.locator('[data-testid="properties-panel"]');
    const box = await panel.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      // Should be at least 200px wide (fits Vector3 inputs) and less than 50% of viewport
      expect(box.width).toBeGreaterThanOrEqual(200);
      expect(box.width).toBeLessThanOrEqual(800);
    }
  });

  test('asset library panel has reasonable default height', async () => {
    const panel = page.locator('[data-testid="asset-library"]');
    const box = await panel.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      // Should be at least 100px tall (visible) and less than 50% of viewport
      expect(box.height).toBeGreaterThanOrEqual(100);
      expect(box.height).toBeLessThanOrEqual(600);
    }
  });

  test('viewport fills remaining space', async () => {
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    const box = await viewport.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      // Viewport should be the largest panel
      expect(box.width).toBeGreaterThan(400);
      expect(box.height).toBeGreaterThan(300);
    }
  });
});

test.describe('No Unexpected Overflow', () => {
  test('properties panel has no horizontal scrollbar', async () => {
    const panel = page.locator('[data-testid="properties-panel"]');

    const hasHorizontalOverflow = await panel.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('scene tree panel has no horizontal scrollbar', async () => {
    const panel = page.locator('[data-testid="scene-tree"]');

    const hasHorizontalOverflow = await panel.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('toolbar has no overflow', async () => {
    const toolbar = page.locator('[data-testid="toolbar"]');

    const hasOverflow = await toolbar.evaluate((el) => {
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    });

    expect(hasOverflow).toBe(false);
  });
});

test.describe('Resizable Panels', () => {
  test('horizontal resize handles are present', async () => {
    const handles = page.locator('.resize-handle-horizontal');
    const count = await handles.count();

    // Should have 2 horizontal handles (between scene-tree|viewport|properties)
    expect(count).toBe(2);
  });

  test('vertical resize handle is present', async () => {
    const handles = page.locator('.resize-handle-vertical');
    const count = await handles.count();

    // Should have 1 vertical handle (between top panels and asset library)
    expect(count).toBe(1);
  });

  test('can resize scene tree panel wider', async () => {
    const panel = page.locator('[data-testid="scene-tree"]');
    const initialBox = await panel.boundingBox();
    expect(initialBox).not.toBeNull();

    // Find the resize handle (first horizontal one is after scene tree)
    const handle = page.locator('.resize-handle-horizontal').first();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    if (handleBox && initialBox) {
      // Drag handle to the right
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + 100, handleBox.y + handleBox.height / 2);
      await page.mouse.up();

      // Check panel got wider
      const newBox = await panel.boundingBox();
      expect(newBox).not.toBeNull();
      if (newBox) {
        expect(newBox.width).toBeGreaterThan(initialBox.width);
      }
    }
  });

  test('can resize asset library panel taller', async () => {
    const panel = page.locator('[data-testid="asset-library"]');
    const initialBox = await panel.boundingBox();
    expect(initialBox).not.toBeNull();

    // Find the vertical resize handle
    const handle = page.locator('.resize-handle-vertical').first();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    if (handleBox && initialBox) {
      // Drag handle upward to make asset library taller
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y - 100);
      await page.mouse.up();

      // Check panel got taller
      const newBox = await panel.boundingBox();
      expect(newBox).not.toBeNull();
      if (newBox) {
        expect(newBox.height).toBeGreaterThan(initialBox.height);
      }
    }
  });
});

test.describe('Toolbar Icons', () => {
  test('tool buttons contain SVG icons', async () => {
    const toolButtons = page.locator('.tool-group .tool-button');
    const count = await toolButtons.count();

    // Should have multiple tool buttons
    expect(count).toBeGreaterThanOrEqual(4);

    // Each should contain an SVG
    for (let i = 0; i < Math.min(count, 4); i++) {
      const button = toolButtons.nth(i);
      const svg = button.locator('svg');
      await expect(svg).toBeVisible();
    }
  });

  test('preview button contains icon and text', async () => {
    const previewButton = page.locator('[data-testid="preview-button"]');

    // Should have SVG icon
    const svg = previewButton.locator('svg');
    await expect(svg).toBeVisible();

    // Should have "Preview" text
    await expect(previewButton).toContainText('Preview');
  });

  test('icons have correct size', async () => {
    const firstToolButton = page.locator('.tool-group .tool-button').first();
    const svg = firstToolButton.locator('svg');

    const size = await svg.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    // Icons should be approximately 18px (as defined in ICON_SIZE)
    expect(size.width).toBeGreaterThanOrEqual(16);
    expect(size.width).toBeLessThanOrEqual(24);
    expect(size.height).toBeGreaterThanOrEqual(16);
    expect(size.height).toBeLessThanOrEqual(24);
  });
});

test.describe('Visual Regression Baselines', () => {
  test.beforeAll(async () => {
    // Reload page to reset any panel resize changes from earlier tests
    await page.reload();
    await page.waitForSelector('[data-testid="editor-layout"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid="viewport-canvas"]', { timeout: 30000 });
  });

  test.beforeEach(async () => {
    // Close any open dialogs that might affect layout
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  });

  test('toolbar visual snapshot', async () => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    await expect(toolbar).toHaveScreenshot('toolbar.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('editor layout visual snapshot', async () => {
    await expect(page).toHaveScreenshot('editor-layout.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('properties panel empty state snapshot', async () => {
    const panel = page.locator('[data-testid="properties-panel"]');
    await expect(panel).toHaveScreenshot('properties-empty.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
