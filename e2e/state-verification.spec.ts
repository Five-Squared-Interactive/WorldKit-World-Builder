/**
 * State Verification E2E Tests
 *
 * Tests that verify actual state changes, not just "no crash"
 * These are more rigorous tests for TDD that assert on outcomes.
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

// Helper to get entity count (excludes row elements which also have tree-node- prefix)
async function getEntityCount(): Promise<number> {
  return page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').count();
}

// Helper to clear all entities
async function clearScene() {
  await pressShortcut(page, 'a', { ctrl: true });
  await page.keyboard.press('Delete');
  await page.waitForTimeout(200);
}

test.describe('Add Object State Verification', () => {
  test.beforeEach(async () => {
    await clearScene();
  });

  test('adding cube should increase entity count by 1', async () => {
    const beforeCount = await getEntityCount();

    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    const afterCount = await getEntityCount();
    expect(afterCount).toBe(beforeCount + 1);
  });

  test('adding multiple primitives should increase count correctly', async () => {
    const beforeCount = await getEntityCount();

    await page.locator('[data-testid="add-cube-button"]').click();
    await page.locator('[data-testid="add-sphere-button"]').click();
    await page.locator('[data-testid="add-plane-button"]').click();
    await page.waitForTimeout(200);

    const afterCount = await getEntityCount();
    expect(afterCount).toBe(beforeCount + 3);
  });

  test('keyboard shortcut Shift+1 should add cube', async () => {
    const beforeCount = await getEntityCount();

    await pressShortcut(page, '1', { shift: true });
    await page.waitForTimeout(200);

    const afterCount = await getEntityCount();
    expect(afterCount).toBe(beforeCount + 1);

    // Verify it's a cube in scene tree
    const lastNode = page.locator('[data-testid^="tree-node-"]').last();
    await expect(lastNode).toContainText('Cube');
  });
});

test.describe('Delete Object State Verification', () => {
  test.beforeEach(async () => {
    await clearScene();
    // Add an object first
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);
  });

  test('deleting selected object should decrease count by 1', async () => {
    // Select the object by clicking on the row (which has the click handler)
    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').first();
    await treeNodeRow.click();

    const beforeCount = await getEntityCount();

    // Delete
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    const afterCount = await getEntityCount();
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('delete should require selection', async () => {
    // Deselect all
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const beforeCount = await getEntityCount();

    // Try to delete without selection
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    const afterCount = await getEntityCount();
    // Count should be unchanged
    expect(afterCount).toBe(beforeCount);
  });
});

test.describe('Undo State Verification', () => {
  test.beforeEach(async () => {
    await clearScene();
  });

  test('undo after add should remove the object', async () => {
    // Add object
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    const afterAdd = await getEntityCount();
    expect(afterAdd).toBe(1);

    // Undo
    await pressShortcut(page, 'z', { ctrl: true });
    await page.waitForTimeout(200);

    const afterUndo = await getEntityCount();
    expect(afterUndo).toBe(0);
  });

  test('undo after delete should restore the object', async () => {
    // Add and delete
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').first();
    await treeNodeRow.click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    const afterDelete = await getEntityCount();
    expect(afterDelete).toBe(0);

    // Undo delete
    await pressShortcut(page, 'z', { ctrl: true });
    await page.waitForTimeout(200);

    const afterUndo = await getEntityCount();
    expect(afterUndo).toBe(1);
  });

  test('multiple undos should work in sequence', async () => {
    // Add three objects
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.locator('[data-testid="add-sphere-button"]').click();
    await page.locator('[data-testid="add-plane-button"]').click();
    await page.waitForTimeout(200);

    expect(await getEntityCount()).toBe(3);

    // Undo three times
    await pressShortcut(page, 'z', { ctrl: true });
    await page.waitForTimeout(100);
    expect(await getEntityCount()).toBe(2);

    await pressShortcut(page, 'z', { ctrl: true });
    await page.waitForTimeout(100);
    expect(await getEntityCount()).toBe(1);

    await pressShortcut(page, 'z', { ctrl: true });
    await page.waitForTimeout(100);
    expect(await getEntityCount()).toBe(0);
  });
});

test.describe('Redo State Verification', () => {
  test.beforeEach(async () => {
    await clearScene();
  });

  test('redo after undo should restore the object', async () => {
    // Add, undo, redo
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);
    expect(await getEntityCount()).toBe(1);

    await pressShortcut(page, 'z', { ctrl: true });
    await page.waitForTimeout(100);
    expect(await getEntityCount()).toBe(0);

    await pressShortcut(page, 'y', { ctrl: true });
    await page.waitForTimeout(100);
    expect(await getEntityCount()).toBe(1);
  });

  test('new action should clear redo stack', async () => {
    // Add, undo, add new
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(100);

    await pressShortcut(page, 'z', { ctrl: true });
    await page.waitForTimeout(100);
    expect(await getEntityCount()).toBe(0);

    // Add a new object (should clear redo stack)
    await page.locator('[data-testid="add-sphere-button"]').click();
    await page.waitForTimeout(100);
    expect(await getEntityCount()).toBe(1);

    // Redo should do nothing (redo stack was cleared)
    await pressShortcut(page, 'y', { ctrl: true });
    await page.waitForTimeout(100);
    expect(await getEntityCount()).toBe(1); // Still 1, not 2
  });
});

test.describe('Duplicate State Verification', () => {
  test.beforeEach(async () => {
    await clearScene();
  });

  test('duplicate should create exact copy', async () => {
    // Add object
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    // Select it by clicking the row
    const treeNodeRow = page.locator('[data-testid^="tree-node-row-"]').first();
    await treeNodeRow.click();

    // Duplicate
    await pressShortcut(page, 'd', { ctrl: true });
    await page.waitForTimeout(200);

    // Should have 2 cubes
    expect(await getEntityCount()).toBe(2);

    // Both should be cubes (use tree-node- but exclude rows)
    const cubeNodes = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').filter({ hasText: 'Cube' });
    expect(await cubeNodes.count()).toBe(2);
  });

  test('duplicate should select the new object', async () => {
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    const firstNodeRow = page.locator('[data-testid^="tree-node-row-"]').first();
    await firstNodeRow.click();

    await pressShortcut(page, 'd', { ctrl: true });
    await page.waitForTimeout(200);

    // The duplicated (new) node should be selected (check outer tree-node elements)
    const selectedNodes = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"]).selected');
    expect(await selectedNodes.count()).toBe(1);
  });
});

test.describe('Selection State Verification', () => {
  test.beforeEach(async () => {
    await clearScene();
    // Add multiple objects
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.locator('[data-testid="add-sphere-button"]').click();
    await page.waitForTimeout(200);
  });

  test('Ctrl+A should select all objects', async () => {
    await pressShortcut(page, 'a', { ctrl: true });
    await page.waitForTimeout(100);

    // Use correct selector for outer tree-node elements (exclude rows)
    const selectedNodes = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"]).selected');
    const totalNodes = await getEntityCount();

    expect(await selectedNodes.count()).toBe(totalNodes);
  });

  test('Escape should deselect all', async () => {
    // Select all first
    await pressShortcut(page, 'a', { ctrl: true });
    await page.waitForTimeout(100);

    // Deselect
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const selectedNodes = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"]).selected');
    expect(await selectedNodes.count()).toBe(0);
  });

  test('clicking object should select only that object', async () => {
    // Click on first node row (the row has the click handler)
    const firstNodeRow = page.locator('[data-testid^="tree-node-row-"]').first();
    await firstNodeRow.click();
    await page.waitForTimeout(100);

    // The outer tree-node divs get the selected class
    const selectedNodes = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"]).selected');
    expect(await selectedNodes.count()).toBe(1);

    // First node (outer wrapper) should have the selected class
    const firstNode = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').first();
    await expect(firstNode).toHaveClass(/selected/);
  });

  test('Ctrl+click should add to selection', async () => {
    // Use row elements for clicking
    const nodeRows = page.locator('[data-testid^="tree-node-row-"]');

    // Click first
    await nodeRows.first().click();
    await page.waitForTimeout(100);

    // Ctrl+click second
    await nodeRows.nth(1).click({ modifiers: ['Control'] });
    await page.waitForTimeout(100);

    // Check selection on outer tree-node elements (not rows)
    const selectedNodes = page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"]).selected');
    expect(await selectedNodes.count()).toBe(2);
  });
});

test.describe('Properties Panel State Verification', () => {
  test.beforeEach(async () => {
    await clearScene();
  });

  test('properties should show "No selection" when nothing selected', async () => {
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).toContainText('No selection');
  });

  test('properties should show object name when selected', async () => {
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    const treeNode = page.locator('[data-testid^="tree-node-"]').first();
    await treeNode.click();
    await page.waitForTimeout(100);

    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    // Name is now in an editable input field
    const nameInput = propertiesPanel.locator('[data-testid="name-input"]');
    await expect(nameInput).toHaveValue('Cube');
    await expect(propertiesPanel).not.toContainText('No selection');
  });

  test('properties should show transform inputs when object selected', async () => {
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    const treeNode = page.locator('[data-testid^="tree-node-"]').first();
    await treeNode.click();
    await page.waitForTimeout(100);

    // Should show Position, Rotation, Scale sections
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).toContainText('Position');
    await expect(propertiesPanel).toContainText('Rotation');
    await expect(propertiesPanel).toContainText('Scale');
  });
});

test.describe('Tool Mode State Verification', () => {
  test('G key should set Move mode', async () => {
    await page.keyboard.press('g');
    await page.waitForTimeout(100);

    // Move tool button should be active
    const moveButton = page.locator('.tool-button').filter({ has: page.locator('svg') }).nth(1);
    await expect(moveButton).toHaveClass(/active/);
  });

  test('R key should set Rotate mode', async () => {
    await page.keyboard.press('r');
    await page.waitForTimeout(100);

    const rotateButton = page.locator('.tool-button').filter({ has: page.locator('svg') }).nth(2);
    await expect(rotateButton).toHaveClass(/active/);
  });

  test('S key should set Scale mode', async () => {
    await page.keyboard.press('s');
    await page.waitForTimeout(100);

    const scaleButton = page.locator('.tool-button').filter({ has: page.locator('svg') }).nth(3);
    await expect(scaleButton).toHaveClass(/active/);
  });

  test('Escape should return to Select mode', async () => {
    // First switch to move mode
    await page.keyboard.press('g');
    await page.waitForTimeout(100);

    // Then back to select
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const selectButton = page.locator('.tool-button').filter({ has: page.locator('svg') }).first();
    await expect(selectButton).toHaveClass(/active/);
  });
});
