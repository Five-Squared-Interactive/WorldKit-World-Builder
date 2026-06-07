/**
 * Auto-Save Service
 *
 * Handles auto-save operations including writing to .autosave directory
 * and recovery from auto-saved data.
 */

import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  AutoSaveRequest,
  AutoSaveResult,
  RecoveryCheckResult,
  RecoveryResult,
} from '../../shared/types/ipc';

/** Auto-save directory name within userData */
const AUTOSAVE_DIR = 'autosave';

/** Auto-save metadata filename */
const AUTOSAVE_META_FILE = 'meta.json';

/** Auto-save VEML filename */
const AUTOSAVE_VEML_FILE = 'world.veml';

interface AutoSaveMeta {
  timestamp: string;
  lastProjectPath?: string;
  lastProjectName?: string;
}

/**
 * Get the path to the auto-save directory
 */
function getAutoSaveDir(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, AUTOSAVE_DIR);
}

/**
 * Ensure the auto-save directory exists
 */
function ensureAutoSaveDir(): void {
  const dir = getAutoSaveDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get auto-save metadata
 */
function getAutoSaveMeta(): AutoSaveMeta | null {
  const metaPath = path.join(getAutoSaveDir(), AUTOSAVE_META_FILE);

  try {
    if (!fs.existsSync(metaPath)) {
      return null;
    }

    const data = fs.readFileSync(metaPath, 'utf-8');
    return JSON.parse(data) as AutoSaveMeta;
  } catch (error) {
    console.error('[autosave] Failed to read meta:', error);
    return null;
  }
}

/**
 * Save auto-save metadata
 */
function saveAutoSaveMeta(meta: AutoSaveMeta): void {
  ensureAutoSaveDir();
  const metaPath = path.join(getAutoSaveDir(), AUTOSAVE_META_FILE);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

/**
 * Perform an auto-save
 */
export function performAutoSave(request: AutoSaveRequest): AutoSaveResult {
  try {
    ensureAutoSaveDir();

    const timestamp = new Date().toISOString();

    // Write VEML content
    const vemlPath = path.join(getAutoSaveDir(), AUTOSAVE_VEML_FILE);
    fs.writeFileSync(vemlPath, request.vemlContent, 'utf-8');

    // Copy model files to assets subfolder if any
    if (request.modelFiles && request.modelFiles.length > 0) {
      const assetsDir = path.join(getAutoSaveDir(), 'assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      for (const modelPath of request.modelFiles) {
        if (fs.existsSync(modelPath)) {
          const fileName = path.basename(modelPath);
          const destPath = path.join(assetsDir, fileName);
          fs.copyFileSync(modelPath, destPath);
        }
      }
    }

    // Save metadata
    saveAutoSaveMeta({
      timestamp,
    });

    console.log('[autosave] Auto-saved at', timestamp);

    return {
      success: true,
      timestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to auto-save';
    console.error('[autosave] Auto-save failed:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if there's an auto-save to recover from
 */
export function checkAutoSaveRecovery(): RecoveryCheckResult {
  const meta = getAutoSaveMeta();

  if (!meta) {
    return { hasRecovery: false };
  }

  const vemlPath = path.join(getAutoSaveDir(), AUTOSAVE_VEML_FILE);
  if (!fs.existsSync(vemlPath)) {
    return { hasRecovery: false };
  }

  return {
    hasRecovery: true,
    autoSaveTime: meta.timestamp,
    isAutoSaveNewer: true, // For now, always offer recovery if auto-save exists
  };
}

/**
 * Recover from auto-save
 */
export function recoverFromAutoSave(): RecoveryResult {
  try {
    const vemlPath = path.join(getAutoSaveDir(), AUTOSAVE_VEML_FILE);

    if (!fs.existsSync(vemlPath)) {
      return {
        success: false,
        error: 'No auto-save data found',
      };
    }

    const vemlContent = fs.readFileSync(vemlPath, 'utf-8');

    return {
      success: true,
      vemlContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to recover';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Discard auto-save recovery data
 */
export function discardAutoSave(): void {
  const dir = getAutoSaveDir();

  try {
    if (fs.existsSync(dir)) {
      // Remove all files in the auto-save directory
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          // Recursively remove directories (like assets)
          fs.rmSync(filePath, { recursive: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }
    console.log('[autosave] Auto-save data discarded');
  } catch (error) {
    console.error('[autosave] Failed to discard:', error);
  }
}

/**
 * Clear auto-save after successful manual save
 * Call this when the user saves their project to clean up auto-save data
 */
export function clearAutoSaveAfterSave(): void {
  discardAutoSave();
}
