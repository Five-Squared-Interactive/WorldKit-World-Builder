/**
 * Electron Test Helpers
 *
 * Utilities for launching and interacting with the WorldKit Electron app in tests.
 */

import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';

export interface AppContext {
  app: ElectronApplication;
  page: Page;
}

/**
 * Find the main application window (not DevTools)
 */
async function findMainWindow(app: ElectronApplication): Promise<Page> {
  // Wait for windows to be available
  let attempts = 0;
  while (attempts < 60) {
    const windows = app.windows();
    console.log(`[E2E] Attempt ${attempts + 1}: Found ${windows.length} windows`);

    for (const win of windows) {
      const url = win.url();
      console.log(`[E2E] Window URL: ${url}`);
      // The main window loads from localhost (dev server on port 5173 or 5174+) or file://
      // Also check for about:blank which can appear initially
      if (url.includes('localhost:517') || url.startsWith('file://') || url.includes('index.html')) {
        console.log(`[E2E] Found main window: ${url}`);
        return win;
      }
    }
    // Wait a bit and check again
    await new Promise((resolve) => setTimeout(resolve, 500));
    attempts++;
  }
  // Fallback to first window if no main window found
  console.log('[E2E] No main window found, falling back to first window');
  return app.firstWindow();
}

/**
 * Launch the WorldKit Electron application
 * @returns App context with electron app and main window page
 */
export async function launchApp(): Promise<AppContext> {
  // Path to the built electron app main process
  const appPath = path.join(__dirname, '../../.vite/build/index.js');

  const app = await electron.launch({
    args: [appPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // Tell the main process to use the Vite dev server (started by Playwright webServer)
      MAIN_WINDOW_VITE_DEV_SERVER_URL: 'http://localhost:5173',
      MAIN_WINDOW_VITE_NAME: 'main_window',
    },
  });

  // Find the main application window (not DevTools)
  const page = await findMainWindow(app);

  // Set a consistent window size for tests
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Wait for app to be ready (EditorLayout rendered)
  await page.waitForSelector('[data-testid="editor-layout"]', { timeout: 30000 });

  return { app, page };
}

/**
 * Close the Electron application
 */
export async function closeApp(app: ElectronApplication): Promise<void> {
  await app.close();
}

/**
 * Get the main window page
 */
export async function getMainWindow(app: ElectronApplication): Promise<Page> {
  const windows = app.windows();
  if (windows.length === 0) {
    return app.firstWindow();
  }
  return windows[0];
}

/**
 * Wait for the app to be fully loaded
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for the viewport canvas to be ready
  await page.waitForSelector('[data-testid="viewport-canvas"]', { timeout: 30000 });
}

/**
 * Simulate keyboard shortcut
 */
export async function pressShortcut(
  page: Page,
  key: string,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
): Promise<void> {
  const keys: string[] = [];
  if (modifiers.ctrl) keys.push('Control');
  if (modifiers.shift) keys.push('Shift');
  if (modifiers.alt) keys.push('Alt');
  keys.push(key);

  await page.keyboard.press(keys.join('+'));
}

/**
 * Click on the 3D viewport at a specific position
 */
export async function clickViewport(
  page: Page,
  x: number,
  y: number
): Promise<void> {
  const viewport = page.locator('[data-testid="viewport-canvas"]');
  const box = await viewport.boundingBox();
  if (!box) throw new Error('Viewport not found');

  await page.mouse.click(box.x + x, box.y + y);
}

/**
 * Add a primitive via menu (simulates menu action)
 */
export async function addPrimitive(
  page: Page,
  type: 'cube' | 'sphere' | 'plane'
): Promise<void> {
  // Trigger the add primitive action via keyboard or menu
  // For now, we'll use the exposed IPC
  await page.evaluate((primitiveType) => {
    // @ts-expect-error - electronAPI is exposed via preload
    window.electronAPI?.onAddPrimitive?.({ type: primitiveType });
  }, type);

  // Wait a bit for the entity to be added
  await page.waitForTimeout(100);
}
