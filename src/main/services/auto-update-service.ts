/**
 * Auto-Update Service
 *
 * Manages application auto-updates using electron-updater.
 * Provides update checking, downloading, and installation lifecycle.
 *
 * Features:
 * - Automatic update checking on app launch
 * - Periodic update checks (configurable interval)
 * - Background download with progress tracking
 * - User-controlled restart timing
 * - Update state machine for consistent status reporting
 */

import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { UpdateChannels } from '../../shared/ipc-channels';
import type { UpdateState, UpdateStatus } from '../../shared/types/ipc';

// Re-export types for backwards compatibility
export type { UpdateState, UpdateStatus } from '../../shared/types/ipc';

/**
 * Update check interval in milliseconds (4 hours)
 */
const UPDATE_CHECK_INTERVAL = 4 * 60 * 60 * 1000;

/**
 * Current update state
 */
let currentState: UpdateState = 'idle';
let currentUpdateInfo: UpdateInfo | null = null;
let currentProgress: number | undefined = undefined;
let currentError: string | undefined = undefined;
let mainWindow: BrowserWindow | null = null;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Callback for status change notifications (used to refresh tray menu)
 */
let onStatusChangeCallback: ((status: UpdateStatus) => void) | null = null;

/**
 * Determines if we're in development mode
 * Auto-updates should be disabled in development
 */
function isDevelopment(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    !app.isPackaged ||
    !!process.env.ELECTRON_IS_DEV
  );
}

/**
 * Sends update status to the renderer process
 */
function sendUpdateStatus(status: UpdateStatus): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(UpdateChannels.STATUS, status);
  }
}

/**
 * Updates the current state and notifies the renderer
 */
function setState(state: UpdateState, extra?: Partial<UpdateStatus>): void {
  currentState = state;

  // Store progress and error for later retrieval
  currentProgress = extra?.progress;
  currentError = extra?.error;

  const status: UpdateStatus = {
    state,
    ...extra,
  };

  if (currentUpdateInfo) {
    status.version = currentUpdateInfo.version;
    status.releaseNotes =
      typeof currentUpdateInfo.releaseNotes === 'string'
        ? currentUpdateInfo.releaseNotes
        : undefined;
    status.releaseDate = currentUpdateInfo.releaseDate;
  }

  sendUpdateStatus(status);
  console.log(`[auto-update] State changed to: ${state}`, extra || '');

  // Notify external listeners (e.g., tray menu refresh)
  if (onStatusChangeCallback) {
    onStatusChangeCallback(status);
  }
}

/**
 * Registers a callback for status changes
 * Used by tray to refresh menu when update status changes
 * @param callback - Function to call when status changes
 */
export function onUpdateStatusChange(callback: (status: UpdateStatus) => void): void {
  onStatusChangeCallback = callback;
}

/**
 * Initializes the auto-update service
 * Sets up electron-updater configuration and event listeners
 *
 * @param window - The main BrowserWindow instance for IPC communication
 */
export function initAutoUpdateService(window: BrowserWindow): void {
  mainWindow = window;

  // Skip auto-update in development
  if (isDevelopment()) {
    console.log('[auto-update] Disabled in development mode');
    return;
  }

  // Configure electron-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;

  // Set up event listeners
  setupUpdateListeners();

  // Check for updates on startup (with delay to let app stabilize)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // Set up periodic update checks
  startPeriodicUpdateCheck();

  console.log('[auto-update] Service initialized');
}

/**
 * Sets up electron-updater event listeners
 */
function setupUpdateListeners(): void {
  autoUpdater.on('checking-for-update', () => {
    setState('checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    currentUpdateInfo = info;
    setState('update-available', {
      version: info.version,
      releaseNotes:
        typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', (_info: UpdateInfo) => {
    setState('no-update');
    // Reset to idle after a short delay
    setTimeout(() => {
      if (currentState === 'no-update') {
        setState('idle');
      }
    }, 3000);
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    setState('downloading', {
      progress: Math.round(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    currentUpdateInfo = info;
    setState('downloaded', {
      version: info.version,
      releaseNotes:
        typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('error', (error: Error) => {
    console.error('[auto-update] Error:', error.message);
    setState('error', {
      error: error.message,
    });
    // Reset to idle after showing error
    setTimeout(() => {
      if (currentState === 'error') {
        setState('idle');
      }
    }, 10000);
  });
}

/**
 * Checks for available updates
 * @returns Promise that resolves when check is complete
 */
export async function checkForUpdates(): Promise<void> {
  if (isDevelopment()) {
    console.log('[auto-update] Skipping update check in development');
    return;
  }

  if (currentState === 'checking' || currentState === 'downloading') {
    console.log('[auto-update] Update operation already in progress');
    return;
  }

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('[auto-update] Failed to check for updates:', error);
    setState('error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Starts periodic update checking
 */
function startPeriodicUpdateCheck(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
  }

  updateCheckInterval = setInterval(() => {
    checkForUpdates();
  }, UPDATE_CHECK_INTERVAL);
}

/**
 * Stops periodic update checking
 */
export function stopPeriodicUpdateCheck(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

/**
 * Quits the app and installs the downloaded update
 */
export function quitAndInstall(): void {
  if (currentState !== 'downloaded') {
    console.log('[auto-update] No update downloaded to install');
    return;
  }

  console.log('[auto-update] Quitting and installing update...');
  autoUpdater.quitAndInstall();
}

/**
 * Gets the current update state
 */
export function getUpdateState(): UpdateState {
  return currentState;
}

/**
 * Gets the current update status
 */
export function getUpdateStatus(): UpdateStatus {
  const status: UpdateStatus = {
    state: currentState,
  };

  if (currentUpdateInfo) {
    status.version = currentUpdateInfo.version;
    status.releaseNotes =
      typeof currentUpdateInfo.releaseNotes === 'string'
        ? currentUpdateInfo.releaseNotes
        : undefined;
    status.releaseDate = currentUpdateInfo.releaseDate;
  }

  // Include progress and error if set
  if (currentProgress !== undefined) {
    status.progress = currentProgress;
  }
  if (currentError !== undefined) {
    status.error = currentError;
  }

  return status;
}

/**
 * Checks if an update is available and downloaded
 */
export function isUpdateReady(): boolean {
  return currentState === 'downloaded';
}

/**
 * Cleans up the auto-update service
 * Call this before app quits
 */
export function cleanupAutoUpdateService(): void {
  stopPeriodicUpdateCheck();
  mainWindow = null;
  onStatusChangeCallback = null;
  // Reset state for clean restart (also needed for tests)
  currentState = 'idle';
  currentUpdateInfo = null;
  currentProgress = undefined;
  currentError = undefined;
  console.log('[auto-update] Service cleaned up');
}
