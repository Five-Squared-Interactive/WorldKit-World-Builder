/**
 * Deep Link Handler
 *
 * Handles worldkit:// protocol deep links.
 * Parses URLs, validates parameters, and routes to appropriate handlers.
 *
 * Supported formats:
 * - worldkit://open?file=/path/to/file.worldkit
 * - worldkit://template/template-name
 */

import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import { DeepLinkChannels } from '../shared/ipc-channels';
import { sanitizeFilePath, isValidFileExtension } from './file-open-handler';

/**
 * Represents a parsed deep link action
 */
export interface DeepLinkAction {
  type: 'open-file' | 'open-template' | 'unknown';
  filePath?: string;
  templateName?: string;
  error?: string;
}

/** Pending deep link URL when window is not yet ready */
let pendingDeepLink: string | null = null;

/**
 * Parses a worldkit:// deep link URL into an action
 * @param url - The deep link URL to parse
 * @returns A DeepLinkAction describing the requested action
 */
export function parseDeepLink(url: string): DeepLinkAction {
  try {
    // Validate input
    if (!url || typeof url !== 'string') {
      return { type: 'unknown', error: 'Invalid URL' };
    }

    // Check for null bytes (security)
    if (url.includes('\0')) {
      return { type: 'unknown', error: 'Invalid URL characters' };
    }

    const parsed = new URL(url);

    // Verify protocol
    if (parsed.protocol !== 'worldkit:') {
      return { type: 'unknown', error: 'Unknown protocol' };
    }

    // Handle worldkit://open?file=path
    // URL parsing: host will be 'open' for worldkit://open?file=...
    if (parsed.host === 'open') {
      const filePath = parsed.searchParams.get('file');
      if (!filePath) {
        return { type: 'unknown', error: 'Missing file parameter' };
      }
      // Note: searchParams.get() already decodes URL-encoded values
      // No need for additional decodeURIComponent() call
      return { type: 'open-file', filePath };
    }

    // Handle worldkit://template/name
    // URL parsing: host will be 'template' for worldkit://template/name
    if (parsed.host === 'template') {
      // pathname will be '/name' so we need to strip the leading slash
      const templateName = parsed.pathname.replace(/^\//, '');
      if (!templateName) {
        return { type: 'unknown', error: 'Missing template name' };
      }
      return { type: 'open-template', templateName };
    }

    return { type: 'unknown', error: `Unknown action: ${parsed.host}` };
  } catch (e) {
    return { type: 'unknown', error: 'Malformed URL' };
  }
}

/**
 * Handles a parsed deep link action
 * @param action - The parsed deep link action
 * @param mainWindow - The main BrowserWindow instance (can be null if not ready)
 */
export function handleDeepLinkAction(
  action: DeepLinkAction,
  mainWindow: BrowserWindow | null
): void {
  console.log('[deep-link] Handling action:', action);

  if (action.type === 'unknown') {
    dialog.showErrorBox(
      'Invalid Link',
      action.error || 'WorldKit could not process this link.'
    );
    return;
  }

  if (action.type === 'open-file' && action.filePath) {
    const filePath = action.filePath;

    // Sanitize and validate the file path
    const sanitizedPath = sanitizeFilePath(filePath);
    if (!sanitizedPath) {
      dialog.showErrorBox(
        'Invalid Path',
        'The file path in this link is invalid or contains suspicious characters.'
      );
      console.log(`[deep-link] Rejected invalid path: ${filePath}`);
      return;
    }

    // Validate file extension
    if (!isValidFileExtension(sanitizedPath)) {
      dialog.showErrorBox(
        'Unsupported File',
        'WorldKit can only open .worldkit and .veml files.'
      );
      console.log(`[deep-link] Rejected file with invalid extension: ${sanitizedPath}`);
      return;
    }

    // Check if file exists
    if (!fs.existsSync(sanitizedPath)) {
      dialog.showErrorBox(
        'File Not Found',
        `The file could not be found:\n\n${sanitizedPath}`
      );
      console.log(`[deep-link] File not found: ${sanitizedPath}`);
      return;
    }

    if (mainWindow) {
      console.log(`[deep-link] Opening file via deep link: ${sanitizedPath}`);
      mainWindow.webContents.send(DeepLinkChannels.OPEN_FILE, sanitizedPath);
      showAndFocusWindow(mainWindow);
    } else {
      console.log(`[deep-link] Window not ready, cannot open file: ${sanitizedPath}`);
    }
    return;
  }

  if (action.type === 'open-template' && action.templateName) {
    const templateName = action.templateName;

    // Basic template name validation - alphanumeric, hyphens, underscores only
    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
      dialog.showErrorBox(
        'Invalid Template',
        'The template name contains invalid characters.'
      );
      console.log(`[deep-link] Invalid template name: ${templateName}`);
      return;
    }

    if (mainWindow) {
      console.log(`[deep-link] Opening template: ${templateName}`);
      mainWindow.webContents.send(DeepLinkChannels.OPEN_TEMPLATE, templateName);
      showAndFocusWindow(mainWindow);
    } else {
      console.log(`[deep-link] Window not ready, cannot open template: ${templateName}`);
    }
    return;
  }
}

/**
 * Shows and focuses a window, restoring it if minimized
 * @param window - The BrowserWindow to show and focus
 */
function showAndFocusWindow(window: BrowserWindow): void {
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}

/**
 * Extracts a deep link URL from command line arguments
 * @param args - Command line arguments (process.argv or second-instance commandLine)
 * @returns The first worldkit:// URL found, or null if none
 */
export function extractDeepLinkFromArgs(args: string[]): string | null {
  for (const arg of args) {
    if (arg.startsWith('worldkit://')) {
      return arg;
    }
  }
  return null;
}

/**
 * Gets and clears the pending deep link
 * Used after window is ready to process links that arrived before window creation
 * @returns The pending deep link URL, or null if none
 */
export function getPendingDeepLink(): string | null {
  const url = pendingDeepLink;
  pendingDeepLink = null;
  return url;
}

/**
 * Sets a pending deep link for later processing
 * Used when a deep link arrives before the window is ready
 * @param url - The deep link URL to store
 */
export function setPendingDeepLink(url: string): void {
  pendingDeepLink = url;
}
