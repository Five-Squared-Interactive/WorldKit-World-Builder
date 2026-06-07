/**
 * Cache Handlers Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import { registerCacheHandlers, unregisterCacheHandlers } from './cacheHandlers';
import { CacheChannels } from '../../shared/ipc-channels';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

// Mock asset cache service
vi.mock('../services/asset-cache-service', () => ({
  assetCacheService: {
    isCached: vi.fn().mockReturnValue(false),
    getCacheEntry: vi.fn().mockReturnValue(null),
    getCachedFilePath: vi.fn().mockReturnValue(null),
    cacheAsset: vi.fn().mockResolvedValue({ success: true }),
    readCachedAsset: vi.fn().mockResolvedValue({ success: false, error: 'Not cached' }),
    removeFromCache: vi.fn().mockResolvedValue(true),
    clearCache: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockReturnValue({
      totalSize: 1024,
      entryCount: 1,
      maxSize: 500 * 1024 * 1024,
    }),
  },
}));

describe('cacheHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterCacheHandlers();
  });

  describe('registerCacheHandlers', () => {
    it('should register IS_CACHED handler', () => {
      registerCacheHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        CacheChannels.IS_CACHED,
        expect.any(Function)
      );
    });

    it('should register GET_ENTRY handler', () => {
      registerCacheHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        CacheChannels.GET_ENTRY,
        expect.any(Function)
      );
    });

    it('should register GET_PATH handler', () => {
      registerCacheHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        CacheChannels.GET_PATH,
        expect.any(Function)
      );
    });

    it('should register CACHE_ASSET handler', () => {
      registerCacheHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        CacheChannels.CACHE_ASSET,
        expect.any(Function)
      );
    });

    it('should register READ_CACHED handler', () => {
      registerCacheHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        CacheChannels.READ_CACHED,
        expect.any(Function)
      );
    });

    it('should register REMOVE handler', () => {
      registerCacheHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        CacheChannels.REMOVE,
        expect.any(Function)
      );
    });

    it('should register CLEAR handler', () => {
      registerCacheHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        CacheChannels.CLEAR,
        expect.any(Function)
      );
    });

    it('should register GET_STATS handler', () => {
      registerCacheHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        CacheChannels.GET_STATS,
        expect.any(Function)
      );
    });
  });

  describe('unregisterCacheHandlers', () => {
    it('should remove all cache handlers', () => {
      registerCacheHandlers();
      unregisterCacheHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(CacheChannels.IS_CACHED);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(CacheChannels.GET_ENTRY);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(CacheChannels.GET_PATH);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(CacheChannels.CACHE_ASSET);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(CacheChannels.READ_CACHED);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(CacheChannels.REMOVE);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(CacheChannels.CLEAR);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(CacheChannels.GET_STATS);
    });
  });
});
