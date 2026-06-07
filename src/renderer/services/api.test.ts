import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, systemAPI, isWorldKitAPIAvailable, WorldKitAPIError } from './api';
import type { WorldKitAPI } from '../../shared/types/ipc';

describe('API Service', () => {
  // Mock window.worldkit
  const mockWorldkitAPI: WorldKitAPI = {
    version: '1.0.0',
    system: {
      getAppVersion: vi.fn().mockResolvedValue('1.2.3'),
      getPlatform: vi.fn().mockResolvedValue('win32'),
      getAppPath: vi.fn().mockResolvedValue('/path/to/userData'),
    },
  };

  beforeEach(() => {
    // Setup mock
    (window as unknown as { worldkit: WorldKitAPI }).worldkit = mockWorldkitAPI;
  });

  afterEach(() => {
    // Cleanup
    vi.clearAllMocks();
    delete (window as unknown as { worldkit?: WorldKitAPI }).worldkit;
  });

  describe('isWorldKitAPIAvailable', () => {
    it('returns true when API is available', () => {
      expect(isWorldKitAPIAvailable()).toBe(true);
    });

    it('returns false when API is not available', () => {
      delete (window as unknown as { worldkit?: WorldKitAPI }).worldkit;
      expect(isWorldKitAPIAvailable()).toBe(false);
    });
  });

  describe('api.getVersion', () => {
    it('returns the API version', () => {
      expect(api.getVersion()).toBe('1.0.0');
    });

    it('returns "unavailable" when API is not present', () => {
      delete (window as unknown as { worldkit?: WorldKitAPI }).worldkit;
      expect(api.getVersion()).toBe('unavailable');
    });
  });

  describe('systemAPI', () => {
    it('getAppVersion calls the API method', async () => {
      const result = await systemAPI.getAppVersion();
      expect(result).toBe('1.2.3');
      expect(mockWorldkitAPI.system.getAppVersion).toHaveBeenCalled();
    });

    it('getPlatform calls the API method', async () => {
      const result = await systemAPI.getPlatform();
      expect(result).toBe('win32');
      expect(mockWorldkitAPI.system.getPlatform).toHaveBeenCalled();
    });

    it('getAppPath calls the API method with correct argument', async () => {
      const result = await systemAPI.getAppPath('userData');
      expect(result).toBe('/path/to/userData');
      expect(mockWorldkitAPI.system.getAppPath).toHaveBeenCalledWith('userData');
    });
  });

  describe('error handling', () => {
    it('throws WorldKitAPIError when API is not available', async () => {
      delete (window as unknown as { worldkit?: WorldKitAPI }).worldkit;

      await expect(systemAPI.getAppVersion()).rejects.toThrow(WorldKitAPIError);
      await expect(systemAPI.getAppVersion()).rejects.toThrow(
        'WorldKit API is not available. Are you running in Electron?'
      );
    });
  });
});
