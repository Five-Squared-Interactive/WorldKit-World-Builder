/**
 * Preview IPC Handlers
 *
 * Handles IPC communication for WebVerse preview operations.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { PreviewChannels } from '../../shared/ipc-channels';
import {
  launchPreview,
  onPreviewStatusChange,
} from '../services/preview-service';
import type { PreviewLaunchRequest } from '../../shared/types/ipc';

/**
 * Register preview IPC handlers
 */
export function registerPreviewHandlers(): void {
  // Launch preview in WebVerse
  ipcMain.handle(
    PreviewChannels.LAUNCH,
    async (_event, request: PreviewLaunchRequest) => {
      return launchPreview(request);
    }
  );

  // Listen for status changes and forward to renderer
  onPreviewStatusChange((status) => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send(PreviewChannels.STATUS, status);
    }
  });
}

/**
 * Unregister preview IPC handlers
 */
export function unregisterPreviewHandlers(): void {
  ipcMain.removeHandler(PreviewChannels.LAUNCH);
}
