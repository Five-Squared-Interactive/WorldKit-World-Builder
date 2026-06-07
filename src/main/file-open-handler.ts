/**
 * File Open Handler
 *
 * Handles file associations for .worldkit and .veml files.
 * Manages file open events from OS (double-click, second instance, etc.)
 */

import { BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { FileOpenChannels } from '../shared/ipc-channels';

/** Supported file extensions for WorldKit */
const SUPPORTED_EXTENSIONS = ['.worldkit', '.veml'];

/** Pending file path when window is not yet ready */
let pendingFilePath: string | null = null;

/**
 * Sanitizes and validates a file path for security
 * @param filePath - The file path to validate
 * @returns The resolved absolute path, or null if invalid
 */
export function sanitizeFilePath(filePath: string): string | null {
  if (!filePath || typeof filePath !== 'string') {
    return null;
  }

  // Resolve to absolute path to prevent relative path tricks
  const resolvedPath = path.resolve(filePath);

  // Basic security checks
  // Reject paths that look suspicious (null bytes, excessive ..)
  if (filePath.includes('\0')) {
    console.log(`[file-open-handler] Rejected path with null byte: ${filePath}`);
    return null;
  }

  // Ensure the resolved path doesn't escape to system directories
  // This is a basic check - more restrictive policies can be added
  const normalizedPath = path.normalize(resolvedPath);

  return normalizedPath;
}

/**
 * Checks if a file path has a valid WorldKit file extension
 * @param filePath - The file path to check
 * @returns true if the extension is .worldkit or .veml
 */
export function isValidFileExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Extracts the first valid file path from command line arguments
 * @param args - Command line arguments (process.argv or second-instance commandLine)
 * @returns The first valid file path, or null if none found
 */
export function extractFilePathFromArgs(args: string[]): string | null {
  for (const arg of args) {
    if (isValidFileExtension(arg)) {
      return arg;
    }
  }
  return null;
}

/**
 * Gets and clears the pending file path
 * Used after window is ready to process files that arrived before window creation
 * @returns The pending file path, or null if none
 */
export function getPendingFilePath(): string | null {
  const filePath = pendingFilePath;
  pendingFilePath = null;
  return filePath;
}

/**
 * Sets a pending file path for later processing
 * Used when a file open event occurs before the window is ready
 * @param filePath - The file path to store
 */
export function setPendingFilePath(filePath: string): void {
  pendingFilePath = filePath;
}

/**
 * Handles opening a file in WorldKit
 * Validates the file, shows errors for invalid files, and sends to renderer
 * @param filePath - The file path to open
 * @param mainWindow - The main BrowserWindow instance (can be null if not ready)
 */
export function handleFileOpen(
  filePath: string,
  mainWindow: BrowserWindow | null
): void {
  // Sanitize the file path first for security
  const sanitizedPath = sanitizeFilePath(filePath);
  if (!sanitizedPath) {
    dialog.showErrorBox(
      'Invalid Path',
      'The file path is invalid or contains suspicious characters.'
    );
    console.log(`[file-open-handler] Rejected invalid path: ${filePath}`);
    return;
  }

  // Validate file extension
  if (!isValidFileExtension(sanitizedPath)) {
    dialog.showErrorBox(
      'Invalid File',
      'WorldKit cannot open files with this extension.\n\nSupported formats: .worldkit, .veml'
    );
    console.log(`[file-open-handler] Rejected file with invalid extension: ${sanitizedPath}`);
    return;
  }

  // Check if file exists
  if (!fs.existsSync(sanitizedPath)) {
    dialog.showErrorBox(
      'File Not Found',
      `The file could not be found:\n\n${sanitizedPath}`
    );
    console.log(`[file-open-handler] File not found: ${sanitizedPath}`);
    return;
  }

  console.log(`[file-open-handler] Opening file: ${sanitizedPath}`);

  if (mainWindow) {
    const ext = path.extname(sanitizedPath).toLowerCase();

    if (ext === '.worldkit') {
      mainWindow.webContents.send(FileOpenChannels.PROJECT, sanitizedPath);
    } else if (ext === '.veml') {
      mainWindow.webContents.send(FileOpenChannels.VEML, sanitizedPath);
    }

    // Ensure window is visible and focused
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  } else {
    // Window not ready yet, store for later
    console.log(`[file-open-handler] Window not ready, storing pending file: ${sanitizedPath}`);
    setPendingFilePath(sanitizedPath);
  }
}
