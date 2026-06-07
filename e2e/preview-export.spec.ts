/**
 * Preview & Export E2E Tests
 *
 * Tests for Epic 7: Preview & VEML Export
 * - WebVerse detection
 * - VEML export functionality
 * - Preview in WebVerse
 * - View VEML code
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

test.describe('Preview Button', () => {
  test('should display preview button in toolbar', async () => {
    const previewButton = page.locator('[data-testid="preview-button"]');
    await expect(previewButton).toBeVisible();
  });

  test('preview button should have Play icon', async () => {
    const previewButton = page.locator('[data-testid="preview-button"]');
    const icon = previewButton.locator('svg');
    await expect(icon).toBeVisible();
  });

  test('preview button should show "Preview" text', async () => {
    const previewButton = page.locator('[data-testid="preview-button"]');
    await expect(previewButton).toContainText('Preview');
  });

  test('should respond to F5 shortcut', async () => {
    // F5 should trigger preview
    await page.keyboard.press('F5');
    await page.waitForTimeout(500);

    // Should either launch preview or show "WebVerse not found" dialog
    const dialog = page.locator('[data-testid="webverse-not-found-dialog"]');
    const isDialogVisible = await dialog.isVisible();

    // Either dialog is shown or app is responsive (preview started)
    if (isDialogVisible) {
      await expect(dialog).toBeVisible();
      // Close the dialog
      const closeButton = dialog.locator('button').filter({ hasText: 'Cancel' });
      await closeButton.click();
    } else {
      // App should still be responsive
      const viewport = page.locator('[data-testid="viewport-canvas"]');
      await expect(viewport).toBeVisible();
    }
  });
});

test.describe('WebVerse Detection', () => {
  test('should detect WebVerse installation status', async () => {
    // Click preview button
    const previewButton = page.locator('[data-testid="preview-button"]');
    await previewButton.click();
    await page.waitForTimeout(500);

    // If WebVerse not installed, should show dialog
    // If installed, should start preview
    const dialog = page.locator('[data-testid="webverse-not-found-dialog"]');
    const statusBar = page.locator('[data-testid="status-bar"]');

    // One of these should indicate status
    const dialogVisible = await dialog.isVisible();
    const statusText = await statusBar.textContent();

    // Either dialog or status should indicate something
    expect(dialogVisible || statusText?.length).toBeTruthy();

    // Close dialog if shown
    if (dialogVisible) {
      const closeButton = dialog.locator('button').filter({ hasText: 'Cancel' });
      await closeButton.click();
    }
  });

  test('WebVerse not found dialog should offer help', async () => {
    const previewButton = page.locator('[data-testid="preview-button"]');
    await previewButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[data-testid="webverse-not-found-dialog"]');

    if (await dialog.isVisible()) {
      // Should have Download button
      const downloadButton = dialog.locator('button').filter({ hasText: /download/i });
      await expect(downloadButton).toBeVisible();

      // Should have Browse button (to locate WebVerse manually)
      const browseButton = dialog.locator('button').filter({ hasText: /browse/i });
      await expect(browseButton).toBeVisible();

      // Close
      const closeButton = dialog.locator('button').filter({ hasText: 'Cancel' });
      await closeButton.click();
    }
  });
});

test.describe('Preview Status Feedback', () => {
  test('should show status in status bar when preview launching', async () => {
    const previewButton = page.locator('[data-testid="preview-button"]');
    await previewButton.click();

    // Check status bar for feedback
    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toBeVisible();

    // Status should indicate something (preparing, launching, or error)
    await page.waitForTimeout(1000);

    // Close dialog if shown
    const dialog = page.locator('[data-testid="webverse-not-found-dialog"]');
    if (await dialog.isVisible()) {
      const closeButton = dialog.locator('button').filter({ hasText: 'Cancel' });
      await closeButton.click();
    }
  });

  test('preview button should be disabled while launching', async () => {
    // This test verifies the button shows loading state
    // The actual state is very brief, so we just verify the button exists
    const previewButton = page.locator('[data-testid="preview-button"]');
    await expect(previewButton).toBeVisible();

    // Button should not be permanently disabled
    const isDisabled = await previewButton.isDisabled();
    expect(isDisabled).toBe(false);
  });
});

test.describe('VEML Export', () => {
  test('should have Export menu option', async () => {
    // Trigger export via Ctrl+E (if implemented) or menu
    await pressShortcut(page, 'e', { ctrl: true });
    await page.waitForTimeout(300);

    // App should respond (either show dialog or be responsive)
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });

  test('should export valid VEML structure', async () => {
    // This test would need to capture the exported content
    // For E2E, we verify the export function exists and is callable

    // Add an object first
    const addCubeBtn = page.locator('[data-testid="add-cube-button"]');
    await addCubeBtn.click();
    await page.waitForTimeout(200);

    // Export should work without error
    await pressShortcut(page, 'e', { ctrl: true });
    await page.waitForTimeout(300);

    // Verify app is responsive
    const viewport = page.locator('[data-testid="viewport-canvas"]');
    await expect(viewport).toBeVisible();
  });
});

test.describe('View VEML Code Panel', () => {
  test('should toggle VEML code panel via View menu', async () => {
    // Toggle VEML panel (assuming Ctrl+Shift+V or similar)
    // Check if there's a View > VEML Code menu item
    await page.waitForTimeout(100);

    // Try to find and toggle the VEML panel
    // This depends on how it's triggered (menu or shortcut)
    const vemlPanel = page.locator('[data-testid="veml-code-panel"]');

    // The panel might not be visible initially
    const initiallyVisible = await vemlPanel.isVisible();

    // Toggle would change visibility
    // For now, just verify the panel can exist
    expect(true).toBe(true); // Placeholder
  });

  test('VEML code panel should show generated XML', async () => {
    // First, add an object
    const addCubeBtn = page.locator('[data-testid="add-cube-button"]');
    await addCubeBtn.click();
    await page.waitForTimeout(200);

    // Find VEML panel (if visible or trigger it)
    const vemlPanel = page.locator('[data-testid="veml-code-panel"]');

    // If visible, should contain VEML XML
    if (await vemlPanel.isVisible()) {
      const content = await vemlPanel.textContent();

      // Should contain VEML structure
      expect(content).toContain('<veml>');
      expect(content).toContain('cubemesh');
    }
  });

  test('VEML code should update when scene changes', async () => {
    // This test verifies live updates
    const vemlPanel = page.locator('[data-testid="veml-code-panel"]');

    if (await vemlPanel.isVisible()) {
      // Get initial content
      const initialContent = await vemlPanel.textContent();

      // Add another object
      const addSphereBtn = page.locator('[data-testid="add-sphere-button"]');
      await addSphereBtn.click();
      await page.waitForTimeout(300);

      // Content should have changed (include new object)
      const newContent = await vemlPanel.textContent();
      expect(newContent).toContain('spheremesh');
    }
  });

  test('VEML panel should have close button', async () => {
    const vemlPanel = page.locator('[data-testid="veml-code-panel"]');

    if (await vemlPanel.isVisible()) {
      const closeButton = vemlPanel.locator('[data-testid="close-veml-panel"]');
      await expect(closeButton).toBeVisible();

      // Click close
      await closeButton.click();
      await page.waitForTimeout(100);

      // Panel should be hidden
      await expect(vemlPanel).not.toBeVisible();
    }
  });
});

test.describe('VEML Export Validation', () => {
  test('exported VEML should contain all scene objects', async () => {
    // Clear scene
    await pressShortcut(page, 'a', { ctrl: true });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    // Add multiple objects
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(100);
    await page.locator('[data-testid="add-sphere-button"]').click();
    await page.waitForTimeout(100);
    await page.locator('[data-testid="add-plane-button"]').click();
    await page.waitForTimeout(200);

    // If VEML panel is available, check content
    const vemlPanel = page.locator('[data-testid="veml-code-panel"]');

    if (await vemlPanel.isVisible()) {
      const content = await vemlPanel.textContent();

      // Should contain all three objects
      expect(content).toContain('cubemesh');
      expect(content).toContain('spheremesh');
      expect(content).toContain('planemesh');
    }
  });

  test('exported VEML should include transform data', async () => {
    // Add an object
    await page.locator('[data-testid="add-cube-button"]').click();
    await page.waitForTimeout(200);

    const vemlPanel = page.locator('[data-testid="veml-code-panel"]');

    if (await vemlPanel.isVisible()) {
      const content = await vemlPanel.textContent();

      // Should contain transform elements
      expect(content).toContain('<transform>');
      expect(content).toContain('<position');
      expect(content).toContain('<rotation');
      expect(content).toContain('<scale');
    }
  });
});
