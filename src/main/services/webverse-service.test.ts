/**
 * WebVerse Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { detectWebVerse, getWebVerseStatus, clearWebVerseCache } from './webverse-service';

/**
 * Normalize path separators for cross-platform test compatibility.
 * On Linux, path.join uses '/' even for Windows-style paths, so
 * we normalize both sides of comparisons.
 */
function normPath(p: unknown): string {
  return String(p).replace(/\\/g, '/');
}

// Mock fs module
vi.mock('fs', () => ({
  accessSync: vi.fn(),
  constants: {
    X_OK: 1,
    F_OK: 0,
  },
}));

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/Users/test'),
  },
}));

describe('WebVerse Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWebVerseCache();
    // Default: files don't exist
    vi.mocked(fs.accessSync).mockImplementation(() => {
      throw new Error('File not found');
    });
  });

  afterEach(() => {
    clearWebVerseCache();
  });

  describe('detectWebVerse', () => {
    it('should return installed: false when WebVerse is not found', () => {
      const result = detectWebVerse();

      expect(result.installed).toBe(false);
      expect(result.path).toBeUndefined();
      expect(result.type).toBeUndefined();
    });

    it('should detect WebVerse in PATH on Windows', () => {
      const originalPlatform = process.platform;
      const originalPath = process.env.PATH;

      // Mock platform
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.PATH = 'C:\\Windows\\System32;C:\\Program Files\\WebVerse';

      // Mock file exists
      vi.mocked(fs.accessSync).mockImplementation((p) => {
        if (normPath(p) === 'C:/Program Files/WebVerse/WebVerse.exe') {
          return; // File exists
        }
        throw new Error('File not found');
      });

      const result = detectWebVerse();

      expect(result.installed).toBe(true);
      expect(normPath(result.path)).toBe('C:/Program Files/WebVerse/WebVerse.exe');
      expect(result.type).toBe('desktop');

      // Restore
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      process.env.PATH = originalPath;
    });

    it('should detect WebVerse Runtime in PATH', () => {
      const originalPath = process.env.PATH;
      const originalPlatform = process.platform;

      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.PATH = 'C:\\WebVerse-Runtime';

      vi.mocked(fs.accessSync).mockImplementation((p) => {
        if (normPath(p) === 'C:/WebVerse-Runtime/WebVerse-Runtime.exe') {
          return;
        }
        throw new Error('File not found');
      });

      const result = detectWebVerse();

      expect(result.installed).toBe(true);
      expect(result.type).toBe('runtime');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      process.env.PATH = originalPath;
    });

    it('should check standard install locations on Windows', () => {
      const originalPlatform = process.platform;
      const originalLocalAppData = process.env.LOCALAPPDATA;

      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local';

      vi.mocked(fs.accessSync).mockImplementation((p) => {
        if (normPath(p) === 'C:/Users/Test/AppData/Local/WebVerse/WebVerse.exe') {
          return;
        }
        throw new Error('File not found');
      });

      clearWebVerseCache();
      const result = detectWebVerse();

      expect(result.installed).toBe(true);
      expect(normPath(result.path)).toBe('C:/Users/Test/AppData/Local/WebVerse/WebVerse.exe');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      process.env.LOCALAPPDATA = originalLocalAppData;
    });
  });

  describe('getWebVerseStatus', () => {
    it('should return cached result on subsequent calls', () => {
      // First call
      const result1 = getWebVerseStatus();
      expect(result1.installed).toBe(false);

      // Now mock file exists
      vi.mocked(fs.accessSync).mockImplementation(() => {
        return; // All files exist
      });

      // Second call should still return cached (not installed)
      const result2 = getWebVerseStatus();
      expect(result2.installed).toBe(false);
    });

    it('should perform fresh detection if cache is cleared', () => {
      const originalPlatform = process.platform;
      const originalPath = process.env.PATH;

      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.PATH = '/usr/bin';

      // First detection - not found
      vi.mocked(fs.accessSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      getWebVerseStatus();

      // Clear cache
      clearWebVerseCache();

      // Now WebVerse is installed
      vi.mocked(fs.accessSync).mockImplementation((path) => {
        if (path === '/usr/bin/webverse') {
          return;
        }
        throw new Error('File not found');
      });

      const result = getWebVerseStatus();
      expect(result.installed).toBe(true);
      expect(result.path).toBe('/usr/bin/webverse');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
      process.env.PATH = originalPath;
    });
  });

  describe('clearWebVerseCache', () => {
    it('should clear the cached detection result', () => {
      // Get initial status (will be cached)
      getWebVerseStatus();

      // Clear cache
      clearWebVerseCache();

      // Mock accessSync to track calls
      const mockAccess = vi.mocked(fs.accessSync);
      mockAccess.mockClear();

      // Next call should trigger fresh detection
      getWebVerseStatus();

      // Should have called accessSync (fresh detection)
      expect(mockAccess).toHaveBeenCalled();
    });
  });
});
