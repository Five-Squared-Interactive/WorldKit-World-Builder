/**
 * WebVerse IPC Handlers
 *
 * Handles IPC requests for WebVerse detection and preview functionality.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { WebVerseChannels } from '../../shared/ipc-channels';
import {
  detectWebVerse,
  getWebVerseStatus,
  setCustomWebVersePath,
} from '../services/webverse-service';
import type { WebVerseBrowseResult } from '../../shared/types/ipc';

/**
 * Get file filter for WebVerse executables based on platform
 */
function getWebVerseFileFilters(): Electron.FileFilter[] {
  if (process.platform === 'win32') {
    return [
      { name: 'Executables', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] },
    ];
  } else if (process.platform === 'darwin') {
    return [
      { name: 'Applications', extensions: ['app'] },
      { name: 'All Files', extensions: ['*'] },
    ];
  } else {
    return [{ name: 'All Files', extensions: ['*'] }];
  }
}

/**
 * Register WebVerse IPC handlers
 */
export function registerWebVerseHandlers(): void {
  // Detect WebVerse installation
  ipcMain.handle(WebVerseChannels.DETECT, () => {
    return detectWebVerse();
  });

  // Get cached detection status
  ipcMain.handle(WebVerseChannels.GET_STATUS, () => {
    return getWebVerseStatus();
  });

  // Browse for WebVerse executable
  ipcMain.handle(WebVerseChannels.BROWSE, async (): Promise<WebVerseBrowseResult> => {
    const mainWindow = BrowserWindow.getFocusedWindow();

    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        title: 'Select WebVerse Executable',
        properties: ['openFile'],
        filters: getWebVerseFileFilters(),
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const selectedPath = result.filePaths[0];

      // Update the cached path
      const detectionResult = setCustomWebVersePath(selectedPath);

      if (detectionResult.installed) {
        return { success: true, path: selectedPath };
      } else {
        return { success: false, error: 'Selected file is not a valid WebVerse executable' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to browse for WebVerse',
      };
    }
  });

  // Set custom WebVerse path
  ipcMain.handle(WebVerseChannels.SET_PATH, (_event, path: string) => {
    return setCustomWebVersePath(path);
  });
}

/**
 * Unregister WebVerse IPC handlers
 */
export function unregisterWebVerseHandlers(): void {
  ipcMain.removeHandler(WebVerseChannels.DETECT);
  ipcMain.removeHandler(WebVerseChannels.GET_STATUS);
  ipcMain.removeHandler(WebVerseChannels.BROWSE);
  ipcMain.removeHandler(WebVerseChannels.SET_PATH);
}
