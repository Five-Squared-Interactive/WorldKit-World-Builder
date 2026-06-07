/**
 * Asset Cache Service
 *
 * Caches downloaded assets locally for offline use.
 * Stores assets in the app data directory with a manifest.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Cache manifest entry for a single asset
 */
export interface CacheEntry {
  /** Unique asset ID */
  id: string;
  /** Original URL or source of the asset */
  source: string;
  /** Local file path relative to cache directory */
  localPath: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the asset */
  mimeType: string;
  /** When the asset was cached (ISO timestamp) */
  cachedAt: string;
  /** When the asset was last accessed (ISO timestamp) */
  lastAccessed: string;
  /** Hash of the file content for integrity verification */
  contentHash: string;
}

/**
 * Cache manifest structure
 */
export interface CacheManifest {
  /** Version of the manifest format */
  version: string;
  /** Map of asset IDs to cache entries */
  entries: Record<string, CacheEntry>;
  /** When the manifest was last updated */
  lastUpdated: string;
  /** Total size of cached assets in bytes */
  totalSize: number;
}

/**
 * Result of a cache operation
 */
export interface CacheResult {
  success: boolean;
  entry?: CacheEntry;
  error?: string;
}

/**
 * Asset Cache Service singleton
 */
class AssetCacheService {
  private cacheDir: string;
  private manifestPath: string;
  private manifest: CacheManifest;
  private initialized = false;

  /** Maximum cache size (500MB) */
  private readonly maxCacheSize = 500 * 1024 * 1024;

  constructor() {
    // Initialize paths (will be set properly when init is called)
    this.cacheDir = '';
    this.manifestPath = '';
    this.manifest = this.createEmptyManifest();
  }

  /**
   * Initialize the cache service
   * Must be called after app.whenReady()
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Set up cache directory in app data
    const userDataPath = app.getPath('userData');
    this.cacheDir = path.join(userDataPath, 'asset-cache');
    this.manifestPath = path.join(this.cacheDir, 'manifest.json');

    // Ensure cache directory exists
    await this.ensureDirectory(this.cacheDir);

    // Load or create manifest
    await this.loadManifest();

    this.initialized = true;
  }

  /**
   * Create an empty manifest
   */
  private createEmptyManifest(): CacheManifest {
    return {
      version: '1.0.0',
      entries: {},
      lastUpdated: new Date().toISOString(),
      totalSize: 0,
    };
  }

  /**
   * Ensure a directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Load manifest from disk or create new one
   */
  private async loadManifest(): Promise<void> {
    try {
      if (fs.existsSync(this.manifestPath)) {
        const content = fs.readFileSync(this.manifestPath, 'utf-8');
        this.manifest = JSON.parse(content);

        // Validate and clean up stale entries
        await this.validateManifest();
      } else {
        this.manifest = this.createEmptyManifest();
        await this.saveManifest();
      }
    } catch (error) {
      console.error('[asset-cache] Failed to load manifest:', error);
      this.manifest = this.createEmptyManifest();
      await this.saveManifest();
    }
  }

  /**
   * Save manifest to disk
   */
  private async saveManifest(): Promise<void> {
    try {
      this.manifest.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2));
    } catch (error) {
      console.error('[asset-cache] Failed to save manifest:', error);
    }
  }

  /**
   * Validate manifest entries exist on disk
   */
  private async validateManifest(): Promise<void> {
    let totalSize = 0;
    const validEntries: Record<string, CacheEntry> = {};

    for (const [id, entry] of Object.entries(this.manifest.entries)) {
      const fullPath = path.join(this.cacheDir, entry.localPath);
      if (fs.existsSync(fullPath)) {
        validEntries[id] = entry;
        totalSize += entry.size;
      }
    }

    this.manifest.entries = validEntries;
    this.manifest.totalSize = totalSize;
    await this.saveManifest();
  }

  /**
   * Generate a hash for file content
   */
  private hashContent(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Generate a unique filename for caching
   */
  private generateCacheFilename(id: string, extension: string): string {
    const hash = crypto.createHash('md5').update(id).digest('hex').substring(0, 8);
    return `${hash}${extension}`;
  }

  /**
   * Check if an asset is cached
   * @param id - Asset ID
   */
  isCached(id: string): boolean {
    if (!this.initialized) return false;
    return id in this.manifest.entries;
  }

  /**
   * Get cached asset info
   * @param id - Asset ID
   */
  getCacheEntry(id: string): CacheEntry | null {
    if (!this.initialized) return null;
    return this.manifest.entries[id] || null;
  }

  /**
   * Get the full path to a cached asset
   * @param id - Asset ID
   */
  getCachedFilePath(id: string): string | null {
    const entry = this.getCacheEntry(id);
    if (!entry) return null;
    return path.join(this.cacheDir, entry.localPath);
  }

  /**
   * Cache an asset
   * @param id - Unique asset ID
   * @param source - Original URL or source
   * @param data - Asset data as Buffer
   * @param mimeType - MIME type of the asset
   * @param extension - File extension (e.g., '.glb')
   */
  async cacheAsset(
    id: string,
    source: string,
    data: Buffer,
    mimeType: string,
    extension: string
  ): Promise<CacheResult> {
    if (!this.initialized) {
      return { success: false, error: 'Cache service not initialized' };
    }

    try {
      // Check if we need to evict old entries
      if (this.manifest.totalSize + data.length > this.maxCacheSize) {
        await this.evictOldEntries(data.length);
      }

      // Generate filename and path
      const filename = this.generateCacheFilename(id, extension);
      const localPath = filename;
      const fullPath = path.join(this.cacheDir, localPath);

      // Write file
      fs.writeFileSync(fullPath, data);

      // Create entry
      const now = new Date().toISOString();
      const entry: CacheEntry = {
        id,
        source,
        localPath,
        size: data.length,
        mimeType,
        cachedAt: now,
        lastAccessed: now,
        contentHash: this.hashContent(data),
      };

      // Update manifest
      this.manifest.entries[id] = entry;
      this.manifest.totalSize += data.length;
      await this.saveManifest();

      return { success: true, entry };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[asset-cache] Failed to cache asset:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Read a cached asset
   * @param id - Asset ID
   */
  async readCachedAsset(id: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    if (!this.initialized) {
      return { success: false, error: 'Cache service not initialized' };
    }

    const entry = this.getCacheEntry(id);
    if (!entry) {
      return { success: false, error: 'Asset not in cache' };
    }

    const fullPath = path.join(this.cacheDir, entry.localPath);

    try {
      const data = fs.readFileSync(fullPath);

      // Update last accessed time
      entry.lastAccessed = new Date().toISOString();
      await this.saveManifest();

      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Remove an asset from cache
   * @param id - Asset ID
   */
  async removeFromCache(id: string): Promise<boolean> {
    if (!this.initialized) return false;

    const entry = this.manifest.entries[id];
    if (!entry) return false;

    try {
      const fullPath = path.join(this.cacheDir, entry.localPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      this.manifest.totalSize -= entry.size;
      delete this.manifest.entries[id];
      await this.saveManifest();

      return true;
    } catch (error) {
      console.error('[asset-cache] Failed to remove asset:', error);
      return false;
    }
  }

  /**
   * Evict oldest entries to make room for new assets
   * @param requiredSpace - Space needed in bytes
   */
  private async evictOldEntries(requiredSpace: number): Promise<void> {
    // Sort entries by last accessed time (oldest first)
    const entries = Object.values(this.manifest.entries).sort(
      (a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
    );

    let freedSpace = 0;
    const targetSpace = this.maxCacheSize * 0.8; // Target 80% capacity

    for (const entry of entries) {
      if (this.manifest.totalSize - freedSpace + requiredSpace <= targetSpace) {
        break;
      }

      await this.removeFromCache(entry.id);
      freedSpace += entry.size;
    }
  }

  /**
   * Clear entire cache
   */
  async clearCache(): Promise<void> {
    if (!this.initialized) return;

    try {
      for (const id of Object.keys(this.manifest.entries)) {
        await this.removeFromCache(id);
      }

      this.manifest = this.createEmptyManifest();
      await this.saveManifest();
    } catch (error) {
      console.error('[asset-cache] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalSize: number; entryCount: number; maxSize: number } {
    return {
      totalSize: this.manifest.totalSize,
      entryCount: Object.keys(this.manifest.entries).length,
      maxSize: this.maxCacheSize,
    };
  }
}

// Export singleton instance
export const assetCacheService = new AssetCacheService();
