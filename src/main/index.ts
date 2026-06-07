import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerAllHandlers } from './ipc';
import { WindowChannels } from '../shared/ipc-channels';
import { createApplicationMenu } from './menu';
import { createTray, destroyTray, updateTrayMenu } from './tray';
import {
  handleFileOpen,
  extractFilePathFromArgs,
  getPendingFilePath,
} from './file-open-handler';
import {
  parseDeepLink,
  handleDeepLinkAction,
  extractDeepLinkFromArgs,
  getPendingDeepLink,
  setPendingDeepLink,
} from './deep-link-handler';
import {
  initAutoUpdateService,
  cleanupAutoUpdateService,
  onUpdateStatusChange,
} from './services/auto-update-service';
import {
  initNetworkService,
  cleanupNetworkService,
} from './services/network-service';
import { assetCacheService } from './services/asset-cache-service';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Skip in test mode to allow E2E tests to run
if (started && process.env.NODE_ENV !== 'test') {
  app.quit();
}

// Request single instance lock to prevent multiple instances
// Skip in test mode to allow multiple test instances
const isTestMode = process.env.NODE_ENV === 'test';
const gotTheLock = isTestMode ? true : app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
}

// Store reference to main window for IPC handlers
let mainWindow: BrowserWindow | null = null;

// Track if app is quitting to differentiate close vs minimize-to-tray
let isQuitting = false;

const createWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'WorldKit World Builder - Untitled World',
    // Window icon
    icon: path.join(__dirname, '../../resources/icons/worldkit-icon.png'),
  });

  // Load the app
  // In test mode, prioritize environment variable over compiled constant
  // This allows E2E tests to specify a different dev server URL
  const devServerUrl = isTestMode
    ? (process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || MAIN_WINDOW_VITE_DEV_SERVER_URL)
    : (MAIN_WINDOW_VITE_DEV_SERVER_URL || process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
  const viteWindowName = process.env.MAIN_WINDOW_VITE_NAME || MAIN_WINDOW_VITE_NAME || 'main_window';

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${viteWindowName}/index.html`)
    );
  }

  // Open DevTools in development (but not in test mode - interferes with E2E tests)
  if ((process.env.NODE_ENV === 'development' || devServerUrl) && !isTestMode) {
    mainWindow.webContents.openDevTools();
  }

  // Block DevTools keyboard shortcut in production
  if (app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Block Ctrl+Shift+I (DevTools shortcut)
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        event.preventDefault();
      }
      // Block F12 (DevTools shortcut)
      if (input.key === 'F12') {
        event.preventDefault();
      }
    });
  }

  // Handle close event - minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      if (mainWindow) {
        updateTrayMenu(mainWindow);
      }
    }
  });

  // Clean up window reference when closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Update tray menu when window visibility changes
  mainWindow.on('show', () => {
    if (mainWindow) {
      updateTrayMenu(mainWindow);
    }
  });

  mainWindow.on('hide', () => {
    if (mainWindow) {
      updateTrayMenu(mainWindow);
    }
  });
};

// Register window-related IPC handlers
function registerWindowHandlers(): void {
  // Handle window title updates from renderer
  ipcMain.handle(WindowChannels.SET_TITLE, (_event, title: string) => {
    if (mainWindow && typeof title === 'string') {
      mainWindow.setTitle(title);
      return true;
    }
    return false;
  });
}

// Handle second instance launch (single-instance behavior)
app.on('second-instance', (_event, commandLine, _workingDirectory) => {
  // Someone tried to run a second instance, focus our window
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();

    // Check for deep link first (takes priority over file associations)
    const deepLink = extractDeepLinkFromArgs(commandLine);
    if (deepLink) {
      const action = parseDeepLink(deepLink);
      handleDeepLinkAction(action, mainWindow);
      return;
    }

    // Fall back to file path extraction
    const filePath = extractFilePathFromArgs(commandLine);
    if (filePath) {
      handleFileOpen(filePath, mainWindow);
    }
  }
});

// macOS: Handle file open events (may fire before ready)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  handleFileOpen(filePath, mainWindow);
});

// macOS: Handle deep link events (may fire before ready)
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('[deep-link] Received URL:', url);

  // If window isn't ready yet, store for later processing
  if (!mainWindow) {
    console.log('[deep-link] Window not ready, storing pending deep link');
    setPendingDeepLink(url);
    return;
  }

  const action = parseDeepLink(url);
  handleDeepLinkAction(action, mainWindow);
});

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize asset cache service
  await assetCacheService.init();

  // Register IPC handlers before creating window
  registerAllHandlers();
  registerWindowHandlers();

  // Set up application menu
  const menu = createApplicationMenu();
  Menu.setApplicationMenu(menu);

  createWindow();

  // Create system tray after window is created
  if (mainWindow) {
    createTray(mainWindow);

    // Initialize auto-update service
    initAutoUpdateService(mainWindow);

    // Initialize network service
    initNetworkService(mainWindow);

    // Refresh tray menu when update status changes
    const window = mainWindow;
    onUpdateStatusChange(() => {
      updateTrayMenu(window);
    });
  }

  // Check for deep link or file to open on startup
  // Priority: deep link from args > deep link pending > file from args > file pending
  const deepLinkFromArgs = extractDeepLinkFromArgs(process.argv);
  const pendingDeepLink = getPendingDeepLink();
  const filePathFromArgs = extractFilePathFromArgs(process.argv);
  const pendingFile = getPendingFilePath();

  const startupDeepLink = deepLinkFromArgs || pendingDeepLink;
  const startupFilePath = filePathFromArgs || pendingFile;

  if (mainWindow && (startupDeepLink || startupFilePath)) {
    // Wait for window to be ready before opening
    mainWindow.webContents.once('did-finish-load', () => {
      // Deep links take priority over file associations
      if (startupDeepLink) {
        const action = parseDeepLink(startupDeepLink);
        handleDeepLinkAction(action, mainWindow);
      } else if (startupFilePath) {
        handleFileOpen(startupFilePath, mainWindow);
      }
    });
  }

  app.on('activate', () => {
    // On macOS, re-create a window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      // Show window if it was hidden
      mainWindow.show();
    }
  });
});

// Set quitting flag before quit to allow window to actually close
app.on('before-quit', () => {
  isQuitting = true;
  destroyTray();
  cleanupAutoUpdateService();
  cleanupNetworkService();
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
