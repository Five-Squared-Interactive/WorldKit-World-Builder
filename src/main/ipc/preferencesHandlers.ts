/**
 * Preferences Handlers
 *
 * IPC handlers for user preferences management.
 */

import { ipcMain } from 'electron';
import { PreferencesChannels } from '../../shared/ipc-channels';
import { loadPreferences, setPreference } from '../services/preferences-service';
import type { Preferences } from '../../shared/types/ipc';

/**
 * Register preferences-related IPC handlers
 */
export function registerPreferencesHandlers(): void {
  // Get all preferences
  ipcMain.handle(PreferencesChannels.GET, async (): Promise<Preferences> => {
    return loadPreferences();
  });

  // Set a preference
  ipcMain.handle(
    PreferencesChannels.SET,
    async <K extends keyof Preferences>(
      _event: Electron.IpcMainInvokeEvent,
      key: K,
      value: Preferences[K]
    ): Promise<void> => {
      setPreference(key, value);
    }
  );
}

/**
 * Unregister preferences-related IPC handlers
 */
export function unregisterPreferencesHandlers(): void {
  ipcMain.removeHandler(PreferencesChannels.GET);
  ipcMain.removeHandler(PreferencesChannels.SET);
}
