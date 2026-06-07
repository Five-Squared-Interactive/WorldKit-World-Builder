/**
 * Scene Handlers
 *
 * IPC handlers for scene manipulation operations.
 * Handles adding primitives and other scene-related events.
 */

import { BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { SceneChannels } from '../../shared/ipc-channels';
import type { PrimitiveType, ImportModelResult } from '../../shared/types/ipc';

/**
 * Supported 3D model file extensions
 */
const MODEL_EXTENSIONS = ['.glb', '.gltf'];

/**
 * Validate that a file path points to a valid 3D model file
 */
function validateModelFile(filePath: string): { valid: boolean; error?: string } {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File does not exist' };
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!MODEL_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Unsupported file type: ${ext}` };
  }

  const stats = fs.statSync(filePath);
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (stats.size > maxSize) {
    return { valid: false, error: 'File is too large. Maximum size is 100MB.' };
  }

  return { valid: true };
}

/**
 * Send add primitive event to all renderer windows
 * Called from menu when user adds a primitive
 * @param type - The type of primitive to add
 */
export function sendAddPrimitiveEvent(type: PrimitiveType): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(SceneChannels.ADD_PRIMITIVE, type);
  }
}

/**
 * Show import dialog and send import model event to renderer
 * Called from menu when user selects File > Import Model
 */
export async function sendImportModelEvent(): Promise<void> {
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
    return;
  }

  const filePath = result.filePaths[0];
  const validation = validateModelFile(filePath);

  if (!validation.valid) {
    dialog.showErrorBox('Import Error', validation.error || 'Invalid file');
    return;
  }

  const importResult: ImportModelResult = {
    success: true,
    filePath,
    fileName: path.basename(filePath),
  };

  // Send to focused window
  if (mainWindow) {
    mainWindow.webContents.send(SceneChannels.IMPORT_MODEL, importResult);
  }
}
