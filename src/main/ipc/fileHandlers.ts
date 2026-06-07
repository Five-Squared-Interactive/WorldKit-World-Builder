/**
 * File IPC Handlers
 *
 * Handles file system operations including model import dialogs.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { FileChannels } from '../../shared/ipc-channels';
import type { ImportModelResult, ReadFileBase64Result } from '../../shared/types/ipc';

/**
 * Supported 3D model file extensions
 */
const MODEL_EXTENSIONS = ['.glb', '.gltf'];

/**
 * MIME types for model files
 */
const MIME_TYPES: Record<string, string> = {
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

/**
 * Validate that a file path points to a valid 3D model file
 */
function validateModelFile(filePath: string): { valid: boolean; error?: string } {
  // Check file exists
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  // Check extension
  const ext = path.extname(filePath).toLowerCase();
  if (!MODEL_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Unsupported file type: ${ext}. Supported types: ${MODEL_EXTENSIONS.join(', ')}` };
  }

  // Check file is readable
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch {
    return { valid: false, error: 'File is not readable' };
  }

  // Check file size (limit to 100MB for now)
  const stats = fs.statSync(filePath);
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (stats.size > maxSize) {
    return { valid: false, error: 'File is too large. Maximum size is 100MB.' };
  }

  return { valid: true };
}

/**
 * Register file IPC handlers
 */
export function registerFileHandlers(): void {
  // Import model dialog handler
  ipcMain.handle(FileChannels.IMPORT_MODEL, async (): Promise<ImportModelResult> => {
    const mainWindow = BrowserWindow.getFocusedWindow();

    const result = await dialog.showOpenDialog(mainWindow || undefined, {
      title: 'Import 3D Model',
      filters: [
        { name: '3D Models', extensions: ['glb', 'gltf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const filePath = result.filePaths[0];
    const validation = validateModelFile(filePath);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return {
      success: true,
      filePath,
      fileName: path.basename(filePath),
    };
  });

  // Read file as base64 handler
  ipcMain.handle(FileChannels.READ_FILE_BASE64, async (_event, filePath: string): Promise<ReadFileBase64Result> => {
    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Invalid file path' };
    }

    // Validate it's a model file (security: prevent arbitrary file reads)
    const ext = path.extname(filePath).toLowerCase();
    if (!MODEL_EXTENSIONS.includes(ext)) {
      return { success: false, error: 'Only 3D model files can be read' };
    }

    const validation = validateModelFile(filePath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const data = fs.readFileSync(filePath);
      const base64 = data.toString('base64');
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      return {
        success: true,
        data: base64,
        mimeType,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to read file',
      };
    }
  });
}

/**
 * Unregister file IPC handlers
 */
export function unregisterFileHandlers(): void {
  ipcMain.removeHandler(FileChannels.IMPORT_MODEL);
  ipcMain.removeHandler(FileChannels.READ_FILE_BASE64);
}
