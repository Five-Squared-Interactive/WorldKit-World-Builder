/**
 * Update IPC Handlers
 *
 * Handles IPC requests for auto-update functionality.
 * Provides handlers for checking updates, getting status, and triggering installation.
 */

import { ipcMain } from 'electron';
import { UpdateChannels } from '../../shared/ipc-channels';
import {
  checkForUpdates,
  quitAndInstall,
  getUpdateStatus,
} from '../services/auto-update-service';

/**
 * Register update-related IPC handlers
 */
export function registerUpdateHandlers(): void {
  // Handle request to check for updates
  ipcMain.handle(UpdateChannels.CHECK, async () => {
    await checkForUpdates();
    return getUpdateStatus();
  });

  // Handle request to get current update status
  ipcMain.handle(UpdateChannels.GET_STATUS, () => {
    return getUpdateStatus();
  });

  // Handle request to quit and install update
  ipcMain.handle(UpdateChannels.QUIT_AND_INSTALL, () => {
    quitAndInstall();
    // This won't return as the app will quit
    return true;
  });
}

/**
 * Unregister update-related IPC handlers
 * Useful for cleanup during testing
 */
export function unregisterUpdateHandlers(): void {
  ipcMain.removeHandler(UpdateChannels.CHECK);
  ipcMain.removeHandler(UpdateChannels.GET_STATUS);
  ipcMain.removeHandler(UpdateChannels.QUIT_AND_INSTALL);
}
