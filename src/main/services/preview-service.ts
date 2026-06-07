/**
 * Preview Service
 *
 * Handles launching the world preview in WebVerse runtime.
 * Manages temp file creation and process spawning.
 */

import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getWebVerseStatus } from './webverse-service';
import type {
  PreviewLaunchRequest,
  PreviewLaunchResult,
  PreviewStatus,
} from '../../shared/types/ipc';

/** Currently running preview process */
let currentPreviewProcess: ChildProcess | null = null;

/** Current preview status */
let currentStatus: PreviewStatus = { state: 'idle' };

/** Status change listeners */
const statusListeners: Set<(status: PreviewStatus) => void> = new Set();

/** Launch timeout (15 seconds) */
const LAUNCH_TIMEOUT_MS = 15000;

/** Auto-clear running status delay (5 seconds) */
const STATUS_AUTO_CLEAR_DELAY_MS = 5000;

/** Status auto-clear timer */
let statusClearTimer: NodeJS.Timeout | null = null;

/**
 * Get the temp directory for preview files
 */
function getTempDir(): string {
  return path.join(app.getPath('temp'), 'worldkit-preview');
}

/**
 * Ensure temp directory exists
 */
async function ensureTempDir(): Promise<void> {
  const tempDir = getTempDir();
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

/**
 * Write VEML content to a temp file
 * @param vemlContent - The VEML content to write
 * @param projectName - Optional project name for the file
 * @returns Path to the temp file
 */
async function writeTempFile(
  vemlContent: string,
  projectName?: string
): Promise<string> {
  await ensureTempDir();

  // Create a unique filename
  const timestamp = Date.now();
  const safeName = (projectName ?? 'preview')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50);
  const fileName = `${safeName}_${timestamp}.veml`;
  const filePath = path.join(getTempDir(), fileName);

  // Write the file
  await fs.writeFile(filePath, vemlContent, 'utf-8');

  return filePath;
}

/**
 * Clean up old temp files (older than 1 hour)
 */
async function cleanupOldTempFiles(): Promise<void> {
  try {
    const tempDir = getTempDir();
    const files = await fs.readdir(tempDir);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith('.veml')) continue;

      const filePath = path.join(tempDir, file);
      const stat = await fs.stat(filePath);

      if (stat.mtimeMs < oneHourAgo) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Update the preview status and notify listeners
 */
function updateStatus(status: PreviewStatus): void {
  // Clear any existing auto-clear timer
  if (statusClearTimer) {
    clearTimeout(statusClearTimer);
    statusClearTimer = null;
  }

  currentStatus = status;

  // Auto-clear running status after a delay
  if (status.state === 'running') {
    statusClearTimer = setTimeout(() => {
      updateStatus({ state: 'idle' });
    }, STATUS_AUTO_CLEAR_DELAY_MS);
  }

  for (const listener of statusListeners) {
    try {
      listener(status);
    } catch (error) {
      console.error('Error in preview status listener:', error);
    }
  }
}

/**
 * Internal function to perform the launch operation
 */
async function performLaunch(
  request: PreviewLaunchRequest,
  webversePath: string
): Promise<PreviewLaunchResult> {
  // Write VEML to temp file
  const tempFilePath = await writeTempFile(
    request.vemlContent,
    request.projectName
  );

  updateStatus({
    state: 'launching',
    tempFilePath,
  });

  // Launch WebVerse with the file
  const args = [tempFilePath];

  // On macOS, if it's an .app bundle, we need to use 'open'
  let command = webversePath;
  let spawnArgs = args;

  if (process.platform === 'darwin' && webversePath.endsWith('.app')) {
    command = 'open';
    spawnArgs = ['-a', webversePath, '--args', ...args];
  }

  const child = spawn(command, spawnArgs, {
    detached: true,
    stdio: 'ignore',
  });

  // Unref so the parent process can exit independently
  child.unref();

  currentPreviewProcess = child;

  updateStatus({
    state: 'running',
    tempFilePath,
    processId: child.pid,
  });

  // Clean up old temp files in the background
  cleanupOldTempFiles();

  return {
    success: true,
    processId: child.pid,
    tempFilePath,
  };
}

/**
 * Create a timeout promise
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Preview launch timed out after ${ms / 1000} seconds`));
    }, ms);
  });
}

/**
 * Launch preview in WebVerse
 * @param request - Preview launch request
 * @returns Launch result
 */
export async function launchPreview(
  request: PreviewLaunchRequest
): Promise<PreviewLaunchResult> {
  // Check if WebVerse is installed
  const webverseStatus = getWebVerseStatus();

  if (!webverseStatus.installed || !webverseStatus.path) {
    return {
      success: false,
      error: 'WebVerse is not installed',
      webverseNotFound: true,
    };
  }

  // Kill any existing preview process
  if (currentPreviewProcess) {
    try {
      currentPreviewProcess.kill();
    } catch {
      // Ignore errors when killing process
    }
    currentPreviewProcess = null;
  }

  updateStatus({ state: 'preparing' });

  try {
    // Launch with timeout
    const result = await Promise.race([
      performLaunch(request, webverseStatus.path),
      createTimeout(LAUNCH_TIMEOUT_MS),
    ]);

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    updateStatus({
      state: 'error',
      error: errorMessage,
    });

    return {
      success: false,
      error: `Failed to launch preview: ${errorMessage}`,
    };
  }
}

/**
 * Get current preview status
 */
export function getPreviewStatus(): PreviewStatus {
  return currentStatus;
}

/**
 * Register a listener for preview status changes
 * @param listener - Callback function
 * @returns Cleanup function
 */
export function onPreviewStatusChange(
  listener: (status: PreviewStatus) => void
): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Reset preview status to idle
 */
export function resetPreviewStatus(): void {
  currentPreviewProcess = null;
  updateStatus({ state: 'idle' });
}
