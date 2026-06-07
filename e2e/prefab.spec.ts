/**
 * Prefab E2E Tests
 *
 * Tests for creating and instantiating prefabs via drag-drop.
 * Note: HTML5 drag-drop events require special handling in Playwright.
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

/**
 * Helper to simulate HTML5 drag-drop between elements
 * Playwright's dragTo doesn't trigger proper HTML5 drag events
 * Uses native DataTransfer API for proper data handling
 */
async function simulateDragDrop(
  page: Page,
  sourceSelector: string,
  targetSelector: string,
  dragData: Record<string, string>
) {
  await page.evaluate(
    ({ sourceSelector, targetSelector, dragData }) => {
      const source = document.querySelector(sourceSelector);
      const target = document.querySelector(targetSelector);

      if (!source || !target) {
        console.error('Could not find source or target for drag-drop');
        console.error('Source selector:', sourceSelector, 'found:', !!source);
        console.error('Target selector:', targetSelector, 'found:', !!target);
        return;
      }

      // Use native DataTransfer API
      const dt = new DataTransfer();
      for (const [key, value] of Object.entries(dragData)) {
        dt.setData(key, value);
      }

      console.log('[Test] Simulating drag-drop');
      console.log('[Test] DataTransfer types:', dt.types);

      // Dispatch dragstart on source
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      source.dispatchEvent(dragStartEvent);
      console.log('[Test] Dispatched dragstart');

      // Dispatch dragover on target
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      target.dispatchEvent(dragOverEvent);
      console.log('[Test] Dispatched dragover');

      // Dispatch drop on target
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      target.dispatchEvent(dropEvent);
      console.log('[Test] Dispatched drop');

      // Dispatch dragend on source
      const dragEndEvent = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
      });
      source.dispatchEvent(dragEndEvent);
      console.log('[Test] Dispatched dragend');
    },
    { sourceSelector, targetSelector, dragData }
  );
}

test.describe('Prefab Creation', () => {
  test.beforeEach(async () => {
    // Clear the scene
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
  });

  test('should create prefab when dropping scene object on asset library', async () => {
    // Add a cube to the scene
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(300);

    // Get the entity ID from the tree node
    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').first();
    const testId = await treeNodeRow.getAttribute('data-testid');
    const entityId = testId?.replace('tree-node-row-', '') || '';

    // Simulate drag-drop with proper data
    await simulateDragDrop(
      page,
      `[data-testid="tree-node-row-${entityId}"]`,
      '.asset-library-content',
      {
        'text/plain': entityId,
        'application/x-tree-node': JSON.stringify({ id: entityId, index: 0, parentId: null }),
      }
    );

    await page.waitForTimeout(300);

    // Prefabs category should now exist
    const prefabTab = page.locator('[data-testid="category-prefabs"]');
    await expect(prefabTab).toBeVisible();

    // Click on prefabs tab
    await prefabTab.click();
    await page.waitForTimeout(100);

    // Should see the prefab (named after the entity)
    const assetGrid = page.locator('[data-testid="asset-grid"]');
    await expect(assetGrid).toContainText('Cube');
  });

  test('should create prefab with hierarchy when dropping group', async () => {
    // Add multiple objects
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.locator('[data-testid="add-sphere-button"]').click();
    await page.waitForTimeout(200);

    // Select all and group
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+g');
    await page.waitForTimeout(300);

    // Get the group node (should be first now)
    const groupNodeRow = page.locator('[data-testid^="tree-node-row-"]').first();
    const testId = await groupNodeRow.getAttribute('data-testid');
    const entityId = testId?.replace('tree-node-row-', '') || '';

    // Simulate drag-drop
    await simulateDragDrop(
      page,
      `[data-testid="tree-node-row-${entityId}"]`,
      '.asset-library-content',
      {
        'text/plain': entityId,
        'application/x-tree-node': JSON.stringify({ id: entityId, index: 0, parentId: null }),
      }
    );

    await page.waitForTimeout(300);

    // Check prefabs tab exists
    const prefabTab = page.locator('[data-testid="category-prefabs"]');
    await expect(prefabTab).toBeVisible();
  });
});

test.describe('Prefab Instantiation', () => {
  test.beforeEach(async () => {
    // Clear the scene
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
  });

  test('should instantiate prefab when dragging from asset library to viewport', async () => {
    // First create a prefab
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(300);

    // Get entity ID and create prefab via simulated drag
    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').first();
    const testId = await treeNodeRow.getAttribute('data-testid');
    const entityId = testId?.replace('tree-node-row-', '') || '';

    await simulateDragDrop(
      page,
      `[data-testid="tree-node-row-${entityId}"]`,
      '.asset-library-content',
      {
        'text/plain': entityId,
        'application/x-tree-node': JSON.stringify({ id: entityId, index: 0, parentId: null }),
      }
    );
    await page.waitForTimeout(300);

    // Clear the scene
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Verify scene is empty
    const entitiesBeforeCount = await page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').count();
    expect(entitiesBeforeCount).toBe(0);

    // Click on prefabs tab
    const prefabTab = page.locator('[data-testid="category-prefabs"]');
    await prefabTab.click();
    await page.waitForTimeout(100);

    // Get the prefab asset and viewport
    const prefabAsset = page.locator('.asset-thumbnail').first();
    const viewport = page.locator('[data-testid="viewport-canvas"]');

    // Get the prefab data for the drag
    const prefabData = await page.evaluate(() => {
      // Get the first prefab from the asset store
      const assetItems = document.querySelectorAll('.asset-thumbnail');
      if (assetItems.length > 0) {
        return true;
      }
      return false;
    });

    if (prefabData) {
      // Use Playwright's built-in dragTo for asset -> viewport (this uses different events)
      await prefabAsset.dragTo(viewport);
      await page.waitForTimeout(300);
    }

    // Should have entity in scene tree
    const entitiesAfterCount = await page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').count();
    expect(entitiesAfterCount).toBeGreaterThan(0);
  });
});
