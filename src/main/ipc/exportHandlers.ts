/**
 * Export IPC Handlers
 *
 * Handles IPC requests for VEML export operations.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ExportChannels } from '../../shared/ipc-channels';
import type { ExportVemlRequest, ExportVemlResult } from '../../shared/types/ipc';

/**
 * Register export IPC handlers
 */
export function registerExportHandlers(): void {
  // Export VEML to file
  ipcMain.handle(
    ExportChannels.VEML,
    async (_event, request: ExportVemlRequest): Promise<ExportVemlResult> => {
      const mainWindow = BrowserWindow.getFocusedWindow();

      try {
        const suggestedName = request.suggestedName || 'world';

        const result = await dialog.showSaveDialog(mainWindow!, {
          title: 'Export VEML',
          defaultPath: `${suggestedName}.veml`,
          filters: [
            { name: 'VEML Files', extensions: ['veml'] },
            { name: 'XML Files', extensions: ['xml'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, cancelled: true };
        }

        // Ensure .veml extension
        let filePath = result.filePath;
        if (!filePath.toLowerCase().endsWith('.veml') && !filePath.toLowerCase().endsWith('.xml')) {
          filePath += '.veml';
        }

        // Write the VEML content
        await fs.promises.writeFile(filePath, request.vemlContent, 'utf-8');

        return { success: true, path: filePath };
      } catch (error) {
        console.error('[export] Failed to export VEML:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export VEML',
        };
      }
    }
  );
}

/**
 * Unregister export IPC handlers
 */
export function unregisterExportHandlers(): void {
  ipcMain.removeHandler(ExportChannels.VEML);
}

/**
 * Trigger export from the main process (e.g., from menu)
 */
export function triggerExport(): void {
  const mainWindow = BrowserWindow.getFocusedWindow();
  if (mainWindow) {
    mainWindow.webContents.send(ExportChannels.TRIGGER_EXPORT);
  }
}
