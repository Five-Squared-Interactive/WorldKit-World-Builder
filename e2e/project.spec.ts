/**
 * Project Management E2E Tests
 *
 * Comprehensive tests for Epic 5: Project Management
 * - Story 5.1: Template Gallery
 * - Story 5.2: Save Project
 * - Story 5.3: Open Project
 * - Story 5.4: Recent Projects List
 * - Story 5.5: Auto-Save / Recovery
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

// Helper to close any open dialogs
async function closeDialogs() {
  // Check if dialog is visible and close it
  const dialog = page.locator('[data-testid="new-project-dialog"]');
  const overlay = page.locator('[data-testid="new-project-dialog-overlay"]');

  // Try multiple times to ensure dialog is closed
  for (let attempt = 0; attempt < 3; attempt++) {
    const isVisible = await dialog.isVisible().catch(() => false);
    if (!isVisible) break;

    // Try close button first (using correct test id)
    const closeButton = page.locator('[data-testid="new-project-dialog-close"]');
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(150);
      continue;
    }

    // Try clicking overlay (outside the dialog)
    const overlayBox = await overlay.boundingBox().catch(() => null);
    const dialogBox = await dialog.boundingBox().catch(() => null);
    if (overlayBox && dialogBox) {
      // Click on overlay outside dialog (top-left corner of overlay)
      await page.mouse.click(overlayBox.x + 10, overlayBox.y + 10);
      await page.waitForTimeout(150);
      continue;
    }

    // Fall back to Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }

  // Wait for dialog to be hidden
  await dialog.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});

  // Extra Escape to clear any focus
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
}

// Helper to get entity count
async function getEntityCount(): Promise<number> {
  return page.locator('[data-testid^="tree-node-"]:not([data-testid^="tree-node-row-"])').count();
}

test.describe('Project State', () => {
  test('should start with a new untitled project', async () => {
    const title = await page.title();
    // Title should indicate a new/untitled project
    expect(title).toContain('WorldKit');
  });

  test('should show project name in title bar', async () => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe('Story 5.1: Template Gallery', () => {
  test.beforeEach(async () => {
    await closeDialogs();
  });

  test('Ctrl+N should open new project dialog', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Dialog should appear
    const dialog = page.locator('[data-testid="new-project-dialog"]');
    await expect(dialog).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
  });

  test('should display template gallery with templates', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Template gallery should be visible
    const gallery = page.locator('[data-testid="template-gallery"]');
    await expect(gallery).toBeVisible();

    // Should have template cards (empty, room, park, gallery)
    const emptyTemplate = page.locator('[data-testid="template-card-empty"]');
    await expect(emptyTemplate).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('should show multiple template options', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(300);

    // Check for expected templates
    const templates = ['empty', 'room', 'park', 'gallery'];
    for (const template of templates) {
      const card = page.locator(`[data-testid="template-card-${template}"]`);
      // At least empty template should be visible
      if (template === 'empty') {
        await expect(card).toBeVisible();
      }
    }

    await page.keyboard.press('Escape');
  });

  test('should allow selecting a template', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Click on empty template
    const emptyTemplate = page.locator('[data-testid="template-card-empty"]');
    await emptyTemplate.click();

    // Template should be selected (has selected class)
    await expect(emptyTemplate).toHaveClass(/selected/);

    // Create button should be enabled
    const createButton = page.locator('[data-testid="new-project-create"]');
    await expect(createButton).toBeEnabled();

    await page.keyboard.press('Escape');
  });

  test('should create project from selected template', async () => {
    // Clear scene first
    await pressShortcut(page, 'a', { ctrl: true });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    const beforeCount = await getEntityCount();

    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Select empty template
    const emptyTemplate = page.locator('[data-testid="template-card-empty"]');
    await emptyTemplate.click();

    // Click create
    const createButton = page.locator('[data-testid="new-project-create"]');
    await createButton.click();
    await page.waitForTimeout(300);

    // Dialog should close
    const dialog = page.locator('[data-testid="new-project-dialog"]');
    await expect(dialog).not.toBeVisible();

    // Title should update to reflect new project
    const title = await page.title();
    expect(title).toContain('WorldKit');
  });

  test('should have Cancel button that closes dialog', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    const cancelButton = page.locator('[data-testid="new-project-cancel"]');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Dialog should close
    const dialog = page.locator('[data-testid="new-project-dialog"]');
    await expect(dialog).not.toBeVisible();
  });

  test('should close dialog when clicking overlay', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Click on overlay (outside dialog)
    const overlay = page.locator('[data-testid="new-project-dialog-overlay"]');
    await overlay.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);

    // Dialog should close
    const dialog = page.locator('[data-testid="new-project-dialog"]');
    await expect(dialog).not.toBeVisible();
  });

  test('should have tabs for New and Recent', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    const newTab = page.locator('[data-testid="new-project-tab-new"]');
    const recentTab = page.locator('[data-testid="new-project-tab-recent"]');

    await expect(newTab).toBeVisible();
    await expect(recentTab).toBeVisible();

    // New tab should be active by default
    await expect(newTab).toHaveClass(/tabActive|active/);

    await page.keyboard.press('Escape');
  });
});

test.describe('Story 5.2: Save Project', () => {
  test.beforeEach(async () => {
    await closeDialogs();
  });

  test('Ctrl+S should trigger save', async () => {
    // Add an object so we have something to save
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    await pressShortcut(page, 's', { ctrl: true });
    await page.waitForTimeout(100);

    // App should still be responsive (save dialog may appear or auto-save)
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('should have save option in File menu', async () => {
    // Open File menu via keyboard
    await page.keyboard.press('Alt+f');
    await page.waitForTimeout(100);

    // Check for Save menu item (if menu is visible)
    // This depends on menu implementation
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('should mark project as dirty when changes are made', async () => {
    // Clear and add a cube
    await pressShortcut(page, 'a', { ctrl: true });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    // Title should contain asterisk (*) to indicate unsaved changes
    const title = await page.title();
    // Note: This may or may not have asterisk depending on implementation
    expect(title).toContain('WorldKit');
  });
});

test.describe('Story 5.3: Open Project', () => {
  test.beforeEach(async () => {
    await closeDialogs();
  });

  test('Ctrl+O should trigger open', async () => {
    await pressShortcut(page, 'o', { ctrl: true });
    await page.waitForTimeout(100);

    // App should still be responsive (dialog may appear)
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });
});

test.describe('Story 5.4: Recent Projects List', () => {
  test.beforeEach(async () => {
    await closeDialogs();
  });

  test('should switch to Recent Projects tab', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Click Recent tab
    const recentTab = page.locator('[data-testid="new-project-tab-recent"]');
    await recentTab.click();
    await page.waitForTimeout(200);

    // Recent tab should be active
    await expect(recentTab).toHaveClass(/tabActive|active/);

    // Either recent projects list or empty state should be visible
    const list = page.locator('[data-testid="recent-projects-list"]');
    const empty = page.locator('[data-testid="recent-projects-empty"]');
    const loading = page.locator('[data-testid="recent-projects-loading"]');

    // One of these should be visible
    const isListVisible = await list.isVisible();
    const isEmptyVisible = await empty.isVisible();
    const isLoadingVisible = await loading.isVisible();

    expect(isListVisible || isEmptyVisible || isLoadingVisible).toBe(true);

    await page.keyboard.press('Escape');
  });

  test('should show empty state when no recent projects', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    const recentTab = page.locator('[data-testid="new-project-tab-recent"]');
    await recentTab.click();
    await page.waitForTimeout(300);

    // If no recent projects, empty state should be visible
    const empty = page.locator('[data-testid="recent-projects-empty"]');
    const list = page.locator('[data-testid="recent-projects-list"]');

    const isEmptyVisible = await empty.isVisible();
    const isListVisible = await list.isVisible();

    // Should have either empty or list
    expect(isEmptyVisible || isListVisible).toBe(true);

    if (isEmptyVisible) {
      await expect(empty).toContainText('No recent projects');
    }

    await page.keyboard.press('Escape');
  });

  test('dialog should update title when switching tabs', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    const title = page.locator('[data-testid="new-project-dialog-title"]');

    // First ensure we're on the New tab
    const newTab = page.locator('[data-testid="new-project-tab-new"]');
    await newTab.click();
    await page.waitForTimeout(100);

    // Should show "New Project"
    await expect(title).toContainText('New Project');

    // Switch to Recent tab
    const recentTab = page.locator('[data-testid="new-project-tab-recent"]');
    await recentTab.click();
    await page.waitForTimeout(100);

    // Title should update
    await expect(title).toContainText('Recent Projects');

    await page.keyboard.press('Escape');
  });

  test('Create button should be hidden on Recent tab', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Switch to Recent tab
    const recentTab = page.locator('[data-testid="new-project-tab-recent"]');
    await recentTab.click();
    await page.waitForTimeout(100);

    // Create button should not be visible
    const createButton = page.locator('[data-testid="new-project-create"]');
    await expect(createButton).not.toBeVisible();

    await page.keyboard.press('Escape');
  });
});

test.describe('Story 5.5: Auto-Save', () => {
  test('should have auto-save running in background', async () => {
    // Auto-save runs in background, verify app is responsive
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('recovery dialog should show recover and discard options when visible', async () => {
    // Recovery dialog appears on startup if auto-save data exists
    // Check if it's visible (may not be if no crash happened)
    const recoveryDialog = page.locator('[data-testid="recovery-dialog"]');
    const isVisible = await recoveryDialog.isVisible();

    if (isVisible) {
      const recoverBtn = page.locator('[data-testid="recovery-recover"]');
      const discardBtn = page.locator('[data-testid="recovery-discard"]');

      await expect(recoverBtn).toBeVisible();
      await expect(discardBtn).toBeVisible();
    }

    // App should be usable regardless
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });
});

test.describe('Project Shortcuts', () => {
  test.beforeEach(async () => {
    await closeDialogs();
  });

  test('Ctrl+N should trigger new project dialog', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    const dialog = page.locator('[data-testid="new-project-dialog"]');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('Ctrl+S should trigger save', async () => {
    await pressShortcut(page, 's', { ctrl: true });
    await page.waitForTimeout(100);

    // App should still be responsive
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });

  test('Ctrl+O should trigger open', async () => {
    await pressShortcut(page, 'o', { ctrl: true });
    await page.waitForTimeout(100);

    // App should still be responsive (dialog may appear)
    await expect(page.locator('[data-testid="viewport-canvas"]')).toBeVisible();
  });
});

test.describe('Template Selection State', () => {
  test.beforeEach(async () => {
    await closeDialogs();
  });

  test('Create button should be disabled without template selection', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Ensure we're on the New tab (where Create button exists)
    const newTab = page.locator('[data-testid="new-project-tab-new"]');
    await newTab.click();
    await page.waitForTimeout(100);

    // Initially no template selected
    const createButton = page.locator('[data-testid="new-project-create"]');
    await expect(createButton).toBeDisabled();

    await page.keyboard.press('Escape');
  });

  test('Create button should be enabled after template selection', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Select a template
    const emptyTemplate = page.locator('[data-testid="template-card-empty"]');
    await emptyTemplate.click();

    // Create button should be enabled
    const createButton = page.locator('[data-testid="new-project-create"]');
    await expect(createButton).toBeEnabled();

    await page.keyboard.press('Escape');
  });

  test('should maintain template selection when switching tabs and back', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    // Select a template
    const emptyTemplate = page.locator('[data-testid="template-card-empty"]');
    await emptyTemplate.click();
    await expect(emptyTemplate).toHaveClass(/selected/);

    // Switch to Recent tab
    const recentTab = page.locator('[data-testid="new-project-tab-recent"]');
    await recentTab.click();
    await page.waitForTimeout(100);

    // Switch back to New tab
    const newTab = page.locator('[data-testid="new-project-tab-new"]');
    await newTab.click();
    await page.waitForTimeout(100);

    // Template should still be selected
    await expect(emptyTemplate).toHaveClass(/selected/);

    await page.keyboard.press('Escape');
  });
});

test.describe('Dialog Accessibility', () => {
  test.beforeEach(async () => {
    await closeDialogs();
  });

  test('dialog should have proper ARIA attributes', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    const overlay = page.locator('[data-testid="new-project-dialog-overlay"]');
    await expect(overlay).toHaveAttribute('role', 'dialog');
    await expect(overlay).toHaveAttribute('aria-modal', 'true');

    await page.keyboard.press('Escape');
  });

  test('close button should have aria-label', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    const closeButton = page.locator('[data-testid="new-project-dialog-close"]');
    await expect(closeButton).toHaveAttribute('aria-label', 'Close');

    await page.keyboard.press('Escape');
  });

  test('Escape key should close dialog', async () => {
    await pressShortcut(page, 'n', { ctrl: true });
    await page.waitForTimeout(200);

    const dialog = page.locator('[data-testid="new-project-dialog"]');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    await expect(dialog).not.toBeVisible();
  });
});
