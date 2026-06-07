/**
 * Cache IPC Handlers
 *
 * IPC handlers for asset cache operations.
 */

import { ipcMain } from 'electron';
import { CacheChannels } from '../../shared/ipc-channels';
import { assetCacheService } from '../services/asset-cache-service';
import type { CacheEntry } from '../services/asset-cache-service';

/**
 * Result types for cache operations
 */
export interface CacheAssetRequest {
  id: string;
  source: string;
  data: string; // Base64 encoded
  mimeType: string;
  extension: string;
}

export interface CacheStatsResult {
  totalSize: number;
  entryCount: number;
  maxSize: number;
}

/**
 * Register cache IPC handlers
 */
export function registerCacheHandlers(): void {
  // Check if asset is cached
  ipcMain.handle(CacheChannels.IS_CACHED, (_event, id: string): boolean => {
    return assetCacheService.isCached(id);
  });

  // Get cache entry info
  ipcMain.handle(CacheChannels.GET_ENTRY, (_event, id: string): CacheEntry | null => {
    return assetCacheService.getCacheEntry(id);
  });

  // Get path to cached file
  ipcMain.handle(CacheChannels.GET_PATH, (_event, id: string): string | null => {
    return assetCacheService.getCachedFilePath(id);
  });

  // Cache an asset
  ipcMain.handle(
    CacheChannels.CACHE_ASSET,
    async (
      _event,
      request: CacheAssetRequest
    ): Promise<{ success: boolean; entry?: CacheEntry; error?: string }> => {
      // Convert base64 to buffer
      const data = Buffer.from(request.data, 'base64');

      return assetCacheService.cacheAsset(
        request.id,
        request.source,
        data,
        request.mimeType,
        request.extension
      );
    }
  );

  // Read cached asset data
  ipcMain.handle(
    CacheChannels.READ_CACHED,
    async (_event, id: string): Promise<{ success: boolean; data?: string; error?: string }> => {
      const result = await assetCacheService.readCachedAsset(id);

      if (result.success && result.data) {
        // Convert buffer to base64 for IPC transfer
        return {
          success: true,
          data: result.data.toString('base64'),
        };
      }

      return { success: false, error: result.error };
    }
  );

  // Remove from cache
  ipcMain.handle(CacheChannels.REMOVE, async (_event, id: string): Promise<boolean> => {
    return assetCacheService.removeFromCache(id);
  });

  // Clear entire cache
  ipcMain.handle(CacheChannels.CLEAR, async (): Promise<void> => {
    return assetCacheService.clearCache();
  });

  // Get cache statistics
  ipcMain.handle(CacheChannels.GET_STATS, (): CacheStatsResult => {
    return assetCacheService.getStats();
  });
}

/**
 * Unregister cache IPC handlers
 */
export function unregisterCacheHandlers(): void {
  ipcMain.removeHandler(CacheChannels.IS_CACHED);
  ipcMain.removeHandler(CacheChannels.GET_ENTRY);
  ipcMain.removeHandler(CacheChannels.GET_PATH);
  ipcMain.removeHandler(CacheChannels.CACHE_ASSET);
  ipcMain.removeHandler(CacheChannels.READ_CACHED);
  ipcMain.removeHandler(CacheChannels.REMOVE);
  ipcMain.removeHandler(CacheChannels.CLEAR);
  ipcMain.removeHandler(CacheChannels.GET_STATS);
}
