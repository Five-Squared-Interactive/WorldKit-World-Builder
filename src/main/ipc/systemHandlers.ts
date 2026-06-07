/**
 * System Domain IPC Handlers
 *
 * Handles system-related IPC requests from the renderer process.
 * All handlers follow the worldkit:system:* channel pattern.
 */

import { ipcMain, app } from 'electron';
import { SystemChannels } from '../../shared/ipc-channels';
import type { AppPathName } from '../../shared/types/ipc';

/**
 * Register all system domain IPC handlers
 */
export function registerSystemHandlers(): void {
  // Get application version from package.json
  ipcMain.handle(SystemChannels.GET_APP_VERSION, async () => {
    return app.getVersion();
  });

  // Get current platform
  ipcMain.handle(SystemChannels.GET_PLATFORM, async () => {
    return process.platform;
  });

  // Get special app directory path
  ipcMain.handle(
    SystemChannels.GET_APP_PATH,
    async (_event, name: AppPathName) => {
      // Validate input
      const validPaths: AppPathName[] = ['userData', 'documents', 'temp', 'home', 'appData'];
      if (!validPaths.includes(name)) {
        throw new Error(`Invalid app path name: ${name}`);
      }

      // Map to Electron's app.getPath names
      const pathMap: Record<AppPathName, Parameters<typeof app.getPath>[0]> = {
        userData: 'userData',
        documents: 'documents',
        temp: 'temp',
        home: 'home',
        appData: 'appData',
      };

      return app.getPath(pathMap[name]);
    }
  );
}

/**
 * Unregister all system handlers (for cleanup/testing)
 */
export function unregisterSystemHandlers(): void {
  ipcMain.removeHandler(SystemChannels.GET_APP_VERSION);
  ipcMain.removeHandler(SystemChannels.GET_PLATFORM);
  ipcMain.removeHandler(SystemChannels.GET_APP_PATH);
}
