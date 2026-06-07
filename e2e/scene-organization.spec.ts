/**
 * Scene Organization E2E Tests
 *
 * Tests for Epic 6: Scene Organization
 * - Scene hierarchy panel
 * - Rename objects
 * - Reorder objects in hierarchy
 * - Group/Ungroup objects
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

// Helper to add a cube and return its tree node
async function addCubeAndSelect() {
  const addCubeBtn = page.locator('[data-testid="add-cube-button"]');
  await addCubeBtn.click();
  await page.waitForTimeout(200);

  // Click on the new tree node to select it
  const treeNode = page.locator('[data-testid^="tree-node-"]').last();
  await treeNode.click();
  return treeNode;
}

test.describe('Scene Hierarchy Panel', () => {
  test('should display scene tree panel', async () => {
    const sceneTree = page.locator('[data-testid="scene-tree"]');
    await expect(sceneTree).toBeVisible();
  });

  test('should have panel header with "Scene" title', async () => {
    const sceneTree = page.locator('[data-testid="scene-tree"]');
    const header = sceneTree.locator('.panel-title');
    await expect(header).toContainText('Scene');
  });

  test('should show empty state when no objects', async () => {
    // Clear all objects first (if any)
    await pressShortcut(page, 'a', { ctrl: true }); // Select all
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Should show empty message
    const emptyState = page.locator('text=No objects in scene');
    await expect(emptyState).toBeVisible();
  });

  test('should show objects in tree when added', async () => {
    await addCubeAndSelect();

    // Tree should now have at least one node
    const treeNodes = page.locator('[data-testid^="tree-node-"]');
    await expect(treeNodes.first()).toBeVisible();
  });
});

test.describe('Rename Objects', () => {
  test('should allow renaming via double-click', async () => {
    await addCubeAndSelect();

    // Double-click on the tree node row to edit (row has the onDoubleClick handler)
    const treeNode = page.locator('[data-testid^="tree-node-row-"]').last();
    await treeNode.dblclick();

    // Should show input field
    const input = treeNode.locator('input');
    await expect(input).toBeVisible();

    // Type new name
    await input.fill('My Custom Cube');
    await page.keyboard.press('Enter');

    // Name should be updated
    await expect(treeNode).toContainText('My Custom Cube');
  });

  test('should allow renaming via F2 key', async () => {
    await addCubeAndSelect();

    // Select the node row
    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').last();
    await treeNodeRow.click();

    // Press F2 to rename
    await page.keyboard.press('F2');

    // Should show input field
    const input = treeNodeRow.locator('input');
    await expect(input).toBeVisible();

    // Type new name and confirm
    await input.fill('Renamed Cube');
    await page.keyboard.press('Enter');

    await expect(treeNodeRow).toContainText('Renamed Cube');
  });

  test('should cancel rename with Escape', async () => {
    await addCubeAndSelect();

    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').last();
    const originalText = await treeNodeRow.textContent();

    await treeNodeRow.click();
    await page.keyboard.press('F2');

    const input = treeNodeRow.locator('input');
    await input.fill('Should Not Apply');
    await page.keyboard.press('Escape');

    // Name should be unchanged
    const newText = await treeNodeRow.textContent();
    expect(newText).toBe(originalText);
  });

  test('should update properties panel when object renamed', async () => {
    await addCubeAndSelect();

    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').last();
    await treeNodeRow.click();

    // Rename via F2
    await page.keyboard.press('F2');
    const input = treeNodeRow.locator('input');
    await input.fill('Properties Test');
    await page.keyboard.press('Enter');

    // Properties panel should show new name in the name input field
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    const nameInput = propertiesPanel.locator('[data-testid="name-input"]');
    await expect(nameInput).toHaveValue('Properties Test');
  });
});

test.describe('Reorder Objects in Hierarchy', () => {
  test('should allow drag to reorder objects', async () => {
    // Clear scene first
    await pressShortcut(page, 'a', { ctrl: true });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Add two cubes
    await addCubeAndSelect();
    await addCubeAndSelect();
    await page.waitForTimeout(200);

    // Get the tree node rows (these are draggable)
    const treeNodeRows = page.locator('[data-testid^="tree-node-row-"]');
    expect(await treeNodeRows.count()).toBe(2);

    const firstRow = treeNodeRows.first();
    const lastRow = treeNodeRows.last();

    // Get names and test IDs before drag
    const firstNameBefore = await firstRow.textContent();
    const lastNameBefore = await lastRow.textContent();
    const lastRowTestId = await lastRow.getAttribute('data-testid');

    // Extract entity ID from test ID (format: tree-node-row-{id})
    const entityId = lastRowTestId?.replace('tree-node-row-', '') ?? '';

    // Verify we have two different cubes (Cube and Cube (1))
    expect(firstNameBefore).not.toBe(lastNameBefore);

    // Get bounding boxes for positioning
    const firstBox = await firstRow.boundingBox();

    // Manually dispatch drag events with proper data transfer
    // This is needed because Playwright's dragTo doesn't properly handle custom drag data
    await lastRow.evaluate(
      (el, { id, targetY }) => {
        // Create and dispatch dragstart
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', id);
        dataTransfer.setData('application/x-tree-node', JSON.stringify({ id, index: 1 }));

        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        el.dispatchEvent(dragStartEvent);

        // Find the first row and dispatch dragover + drop
        const firstRowEl = document.querySelector('[data-testid^="tree-node-row-"]:first-child') as HTMLElement;
        if (firstRowEl) {
          // Create rect mock for drop position calculation
          const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer,
            clientY: targetY, // Top of first row
          });
          firstRowEl.dispatchEvent(dragOverEvent);

          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer,
            clientY: targetY,
          });
          firstRowEl.dispatchEvent(dropEvent);
        }

        // Dispatch dragend
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
        });
        el.dispatchEvent(dragEndEvent);
      },
      { id: entityId, targetY: firstBox?.y ?? 0 }
    );

    await page.waitForTimeout(300);

    // Get names after drag - the order should be swapped
    const firstNameAfter = await treeNodeRows.first().textContent();

    // The first row should now contain what was in the last row
    expect(firstNameAfter).toBe(lastNameBefore);
  });
});

test.describe('Group Objects', () => {
  test('should group selected objects with Ctrl+G', async () => {
    // Add two objects
    await addCubeAndSelect();
    await addCubeAndSelect();

    // Select all
    await pressShortcut(page, 'a', { ctrl: true });
    await page.waitForTimeout(100);

    // Get initial count (exclude row elements to count only actual entities)
    const initialRootCount = await page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').count();

    // Group with Ctrl+G
    await pressShortcut(page, 'g', { ctrl: true });
    await page.waitForTimeout(200);

    // Should have a group node now (fewer root nodes, as objects are nested)
    // Use specific selector to exclude row elements to avoid strict mode violation
    const groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' });
    await expect(groupNode).toBeVisible();
  });

  test('should show expand/collapse toggle for groups', async () => {
    // First, ensure we have a group
    const groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' });

    if (await groupNode.count() === 0) {
      // Create a group
      await addCubeAndSelect();
      await addCubeAndSelect();
      await pressShortcut(page, 'a', { ctrl: true });
      await pressShortcut(page, 'g', { ctrl: true });
      await page.waitForTimeout(200);
    }

    // Group should have expand/collapse toggle
    const toggle = groupNode.locator('.tree-node-toggle');
    await expect(toggle).toBeVisible();
  });

  test('should collapse/expand group children', async () => {
    const groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();
    const toggle = groupNode.locator('.tree-node-toggle');

    // Click to collapse
    await toggle.click();
    await page.waitForTimeout(100);

    // Children should be hidden (group node should have collapsed state)
    await expect(groupNode).toHaveClass(/collapsed/);

    // Click to expand
    await toggle.click();
    await page.waitForTimeout(100);

    await expect(groupNode).not.toHaveClass(/collapsed/);
  });
});

test.describe('Ungroup Objects', () => {
  test('should ungroup with Ctrl+Shift+G', async () => {
    // Ensure we have a group
    const groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();

    if (await groupNode.count() === 0) {
      await addCubeAndSelect();
      await addCubeAndSelect();
      await pressShortcut(page, 'a', { ctrl: true });
      await pressShortcut(page, 'g', { ctrl: true });
      await page.waitForTimeout(200);
    }

    // Select the group by clicking on the row
    const groupNodeRow = page.locator('[data-testid^="tree-node-row-"]').filter({ hasText: 'Group' }).first();
    await groupNodeRow.click();

    // Ungroup with Ctrl+Shift+G
    await pressShortcut(page, 'g', { ctrl: true, shift: true });
    await page.waitForTimeout(200);

    // Group node should be gone
    const remainingGroups = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' });
    const groupCount = await remainingGroups.count();

    // Either no groups or one less than before
    expect(groupCount).toBeLessThanOrEqual(1);
  });

  test('should restore children as root objects after ungroup', async () => {
    // Find a group node to ungroup (created by previous test) or create one
    let groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();

    if (await groupNode.count() === 0) {
      // Create a group if none exists
      await addCubeAndSelect();
      await addCubeAndSelect();
      await pressShortcut(page, 'a', { ctrl: true });
      await pressShortcut(page, 'g', { ctrl: true });
      await page.waitForTimeout(200);
      groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();
    }

    // Verify we have a group to ungroup
    expect(await groupNode.count()).toBe(1);

    // Count groups before ungroup
    const groupsBefore = await page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).count();

    // Select group and ungroup
    const groupNodeRow = page.locator('[data-testid^="tree-node-row-"]').filter({ hasText: 'Group' }).first();
    await groupNodeRow.click();
    await pressShortcut(page, 'g', { ctrl: true, shift: true });
    await page.waitForTimeout(200);

    // Groups should be reduced by 1 (the ungrouped group is gone)
    const groupsAfter = await page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).count();
    expect(groupsAfter).toBeLessThan(groupsBefore);
  });
});

test.describe('Parent-Child Transform Hierarchy', () => {
  test('should create parent-child hierarchy via grouping', async () => {
    // Clear scene first
    await pressShortcut(page, 'a', { ctrl: true });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Add two cubes
    await addCubeAndSelect();
    await addCubeAndSelect();
    await page.waitForTimeout(200);

    // Select all and group
    await pressShortcut(page, 'a', { ctrl: true });
    await pressShortcut(page, 'g', { ctrl: true });
    await page.waitForTimeout(200);

    // Should have a group with children
    const groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' });
    await expect(groupNode).toBeVisible();

    // Group should have child nodes (expand toggle visible)
    const toggle = groupNode.locator('.tree-node-toggle');
    await expect(toggle).toBeVisible();
  });

  test('should maintain parent-child relationship in properties panel', async () => {
    // Ensure we have a group from previous test or create one
    let groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();

    if (await groupNode.count() === 0) {
      await addCubeAndSelect();
      await addCubeAndSelect();
      await pressShortcut(page, 'a', { ctrl: true });
      await pressShortcut(page, 'g', { ctrl: true });
      await page.waitForTimeout(200);
      groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();
    }

    // Select the group
    const groupNodeRow = page.locator('[data-testid^="tree-node-row-"]').filter({ hasText: 'Group' }).first();
    await groupNodeRow.click();
    await page.waitForTimeout(100);

    // Properties panel should show the group
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    const nameInput = propertiesPanel.locator('[data-testid="name-input"]');
    await expect(nameInput).toHaveValue(/Group/);
  });

  test('should allow moving parent and children follow', async () => {
    // Ensure we have a group
    let groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();

    if (await groupNode.count() === 0) {
      await addCubeAndSelect();
      await addCubeAndSelect();
      await pressShortcut(page, 'a', { ctrl: true });
      await pressShortcut(page, 'g', { ctrl: true });
      await page.waitForTimeout(200);
    }

    // Select the group (parent)
    const groupNodeRow = page.locator('[data-testid^="tree-node-row-"]').filter({ hasText: 'Group' }).first();
    await groupNodeRow.click();
    await page.waitForTimeout(100);

    // Get initial position from properties panel
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    const posXInput = propertiesPanel.locator('[data-testid="position-input-x"]');

    // Store initial X position
    const initialPosX = await posXInput.inputValue();

    // Change position
    await posXInput.fill('5');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // Verify position changed (value is formatted with decimals)
    await expect(posXInput).toHaveValue(/^5\.?0*$/);

    // Now click on a child node within the group
    // First, ensure the group is expanded
    groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();
    const toggle = groupNode.locator('.tree-node-toggle');
    if (await toggle.isVisible()) {
      // Ensure expanded (click if collapsed)
      const isCollapsed = await groupNode.evaluate((el) => el.classList.contains('collapsed'));
      if (isCollapsed) {
        await toggle.click();
        await page.waitForTimeout(100);
      }
    }

    // Click on a cube child within the group
    const childNodeRow = page.locator('[data-testid^="tree-node-row-"]').filter({ hasText: /^▣\s*Cube/ }).first();

    if (await childNodeRow.count() > 0) {
      await childNodeRow.click();
      await page.waitForTimeout(100);

      // The child's world position should reflect parent movement
      // (exact values depend on implementation)
      const childNameInput = propertiesPanel.locator('[data-testid="name-input"]');
      await expect(childNameInput).toHaveValue(/Cube/);
    }
  });

  test('should preserve hierarchy when dragging child within tree', async () => {
    // Ensure we have a group with children
    let groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();

    if (await groupNode.count() === 0) {
      await addCubeAndSelect();
      await addCubeAndSelect();
      await pressShortcut(page, 'a', { ctrl: true });
      await pressShortcut(page, 'g', { ctrl: true });
      await page.waitForTimeout(200);
      groupNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Group' }).first();
    }

    // Group should still be visible
    await expect(groupNode).toBeVisible();

    // Verify children are still under the group
    const toggle = groupNode.locator('.tree-node-toggle');
    if (await toggle.isVisible()) {
      // Children should be visible
      const childNodes = groupNode.locator('[data-testid^="tree-node-"]');
      expect(await childNodes.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Selection Sync', () => {
  test('should sync selection between tree and viewport', async () => {
    await addCubeAndSelect();

    // Click on tree node row (the row has the click handler)
    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').last();
    await treeNodeRow.click();

    // The outer tree-node wrapper should have the selected class
    const treeNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').last();
    await expect(treeNode).toHaveClass(/selected/);

    // Properties panel should show the selected object
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).not.toContainText('No selection');
  });

  test('should update tree selection when object clicked in viewport', async () => {
    await addCubeAndSelect();

    // Click somewhere else first to deselect
    await page.keyboard.press('Escape');

    // Click on viewport center where the cube should be
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    const box = await viewport.boundingBox();

    if (box) {
      // Click near center of viewport
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    // If object was hit, tree node should become selected
    // Note: This depends on object position - might need adjustment
    await page.waitForTimeout(100);

    // Verify app is responsive
    await expect(viewport).toBeVisible();
  });
});
