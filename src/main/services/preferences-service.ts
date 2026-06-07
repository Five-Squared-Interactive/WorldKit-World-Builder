/**
 * Preferences Service
 *
 * Manages user preferences stored in a JSON file.
 */

import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Preferences filename */
const PREFERENCES_FILE = 'preferences.json';

/** Default preferences */
export interface Preferences {
  /** Whether auto-save is enabled */
  autoSaveEnabled: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;
}

const DEFAULT_PREFERENCES: Preferences = {
  autoSaveEnabled: true,
  autoSaveInterval: 2 * 60 * 1000, // 2 minutes
};

/**
 * Get the path to the preferences file
 */
function getPreferencesPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, PREFERENCES_FILE);
}

/**
 * Load preferences from disk
 */
export function loadPreferences(): Preferences {
  const filePath = getPreferencesPath();

  try {
    if (!fs.existsSync(filePath)) {
      return { ...DEFAULT_PREFERENCES };
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const loaded = JSON.parse(data) as Partial<Preferences>;

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_PREFERENCES,
      ...loaded,
    };
  } catch (error) {
    console.error('[preferences] Failed to load:', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Save preferences to disk
 */
export function savePreferences(prefs: Partial<Preferences>): Preferences {
  const filePath = getPreferencesPath();

  try {
    // Load existing preferences and merge
    const existing = loadPreferences();
    const updated = { ...existing, ...prefs };

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (error) {
    console.error('[preferences] Failed to save:', error);
    return loadPreferences();
  }
}

/**
 * Get a specific preference value
 */
export function getPreference<K extends keyof Preferences>(key: K): Preferences[K] {
  const prefs = loadPreferences();
  return prefs[key];
}

/**
 * Set a specific preference value
 */
export function setPreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K]
): Preferences {
  return savePreferences({ [key]: value });
}
