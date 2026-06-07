/**
 * Network IPC Handlers
 *
 * Handles IPC communication for network connectivity status.
 */

import { ipcMain } from 'electron';
import { NetworkChannels } from '../../shared/ipc-channels';
import { getNetworkStatus } from '../services/network-service';

/**
 * Register network-related IPC handlers
 */
export function registerNetworkHandlers(): void {
  // Handler for getting current network status
  ipcMain.handle(NetworkChannels.GET_STATUS, () => {
    return getNetworkStatus();
  });
}

/**
 * Unregister network-related IPC handlers
 * Useful for cleanup during testing
 */
export function unregisterNetworkHandlers(): void {
  ipcMain.removeHandler(NetworkChannels.GET_STATUS);
}
