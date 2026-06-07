/**
 * System Tray Management
 *
 * Provides system tray functionality for WorldKit including:
 * - Tray icon with tooltip
 * - Context menu (New World, Open Recent, Show/Hide, Quit)
 * - Click to restore window
 */

import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import path from 'node:path';
import { TrayChannels, ProjectChannels } from '../shared/ipc-channels';
import { isUpdateReady, checkForUpdates, quitAndInstall } from './services/auto-update-service';
import { getRecentProjects } from './services/recent-projects-service';

let tray: Tray | null = null;

/**
 * Creates a tray icon from available resources
 * Falls back to a simple generated icon if no asset exists
 */
function getTrayIcon(): Electron.NativeImage {
  // Try to load platform-specific icon
  const iconName =
    process.platform === 'darwin' ? 'tray-icon-Template.png' : 'tray-icon.png';

  // In development, __dirname points to .vite/build
  // In production, it points to the resources folder
  const possiblePaths = [
    path.join(__dirname, '../../resources/icons/tray', iconName),
    path.join(__dirname, '../../../resources/icons/tray', iconName),
    path.join(app.getAppPath(), 'resources/icons/tray', iconName),
  ];

  for (const iconPath of possiblePaths) {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      // Resize for tray (16x16 on most platforms, 22x22 on some Linux)
      return icon.resize({ width: 16, height: 16 });
    }
  }

  // Fallback: Create a simple "W" icon programmatically
  // This is a 16x16 PNG with a simple "W" shape
  return createFallbackIcon();
}

/**
 * Creates a simple fallback tray icon
 * A basic blue square with "W" - placeholder until proper assets are added
 */
function createFallbackIcon(): Electron.NativeImage {
  // Create a simple 16x16 icon using a data URL
  // This is a minimal blue square placeholder
  const size = 16;

  // Create a simple icon buffer (RGBA format)
  const buffer = Buffer.alloc(size * size * 4);

  // Fill with a blue color (#3b82f6 - the accent color)
  for (let i = 0; i < size * size; i++) {
    buffer[i * 4] = 59; // R
    buffer[i * 4 + 1] = 130; // G
    buffer[i * 4 + 2] = 246; // B
    buffer[i * 4 + 3] = 255; // A
  }

  return nativeImage.createFromBuffer(buffer, {
    width: size,
    height: size,
  });
}

/**
 * Creates and initializes the system tray
 * @param mainWindow - The main application window to control
 * @returns The created Tray instance
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  const icon = getTrayIcon();

  tray = new Tray(icon);
  tray.setToolTip('World Builder');

  // Build context menu (window is visible on create, check update status)
  const contextMenu = buildContextMenu(mainWindow, {
    isVisible: true,
    updateAvailable: isUpdateReady(),
  });
  tray.setContextMenu(contextMenu);

  // Handle click to restore window (primary action on Windows)
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });

  // Handle double-click (Windows-specific behavior)
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

/**
 * Builds the tray context menu
 * @param mainWindow - The main window to control
 * @param options - Menu options (visibility, update status)
 */
function buildContextMenu(
  mainWindow: BrowserWindow,
  options: { isVisible?: boolean; updateAvailable?: boolean } = {}
): Menu {
  const { isVisible = true, updateAvailable = false } = options;

  // Build recent projects submenu
  const recentProjects = getRecentProjects();
  const recentSubmenu: Electron.MenuItemConstructorOptions[] =
    recentProjects.length > 0
      ? recentProjects.map((project) => ({
          label: project.name,
          enabled: project.exists !== false,
          click: () => {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send(ProjectChannels.OPEN_RECENT, project.path);
          },
        }))
      : [{ label: 'No Recent Projects', enabled: false }];

  const menuItems: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'New World',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send(ProjectChannels.NEW);
      },
    },
    {
      label: 'Open Recent',
      submenu: recentSubmenu,
    },
    { type: 'separator' },
  ];

  // Add update menu items
  if (updateAvailable) {
    menuItems.push({
      label: 'Update Available - Restart to Install',
      click: () => {
        quitAndInstall();
      },
    });
  } else {
    menuItems.push({
      label: 'Check for Updates',
      click: () => {
        checkForUpdates();
      },
    });
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: isVisible ? 'Hide World Builder' : 'Show World Builder',
      click: () => {
        if (isVisible) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    }
  );

  return Menu.buildFromTemplate(menuItems);
}

/**
 * Updates the tray context menu
 * Call this when window visibility changes to update Show/Hide label
 * Also updates when update status changes
 * @param mainWindow - The main window to check visibility
 */
export function updateTrayMenu(mainWindow: BrowserWindow): void {
  if (!tray) return;

  const isVisible = mainWindow.isVisible();
  const updateAvailable = isUpdateReady();

  const contextMenu = buildContextMenu(mainWindow, { isVisible, updateAvailable });
  tray.setContextMenu(contextMenu);

  // Update tooltip to indicate update availability
  if (updateAvailable) {
    tray.setToolTip('World Builder - Update Available');
  } else {
    tray.setToolTip('World Builder');
  }
}

/**
 * Gets the current tray instance
 * @returns The Tray instance or null if not created
 */
export function getTray(): Tray | null {
  return tray;
}

/**
 * Destroys the system tray
 * Call this before app quits
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
