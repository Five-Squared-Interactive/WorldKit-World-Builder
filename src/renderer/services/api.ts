/**
 * WorldKit API Service
 *
 * Typed wrapper around window.worldkit for use in React components.
 * Provides type-safe access to the IPC bridge with error handling.
 */

import type { WorldKitAPI, AppPathName } from '../../shared/types/ipc';

/**
 * Error thrown when the WorldKit API is not available
 */
export class WorldKitAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorldKitAPIError';
  }
}

/**
 * Check if the WorldKit API is available
 */
export function isWorldKitAPIAvailable(): boolean {
  return typeof window !== 'undefined' && window.worldkit !== undefined;
}

/**
 * Get the WorldKit API with validation
 * @throws WorldKitAPIError if API is not available
 */
function getAPI(): WorldKitAPI {
  if (!isWorldKitAPIAvailable()) {
    throw new WorldKitAPIError(
      'WorldKit API is not available. Are you running in Electron?'
    );
  }
  return window.worldkit;
}

/**
 * System API methods
 */
export const systemAPI = {
  /**
   * Get the application version
   */
  async getAppVersion(): Promise<string> {
    return getAPI().system.getAppVersion();
  },

  /**
   * Get the current platform
   */
  async getPlatform(): Promise<NodeJS.Platform> {
    return getAPI().system.getPlatform();
  },

  /**
   * Get a special app directory path
   */
  async getAppPath(name: AppPathName): Promise<string> {
    return getAPI().system.getAppPath(name);
  },
};

/**
 * Complete API object for convenient access
 */
export const api = {
  system: systemAPI,

  /**
   * Get the API version
   */
  getVersion(): string {
    if (!isWorldKitAPIAvailable()) {
      return 'unavailable';
    }
    return getAPI().version;
  },

  /**
   * Check if API is available
   */
  isAvailable: isWorldKitAPIAvailable,
};

export default api;
