/**
 * Auto-Update Service Tests
 *
 * Tests for the auto-update service functionality.
 * Note: These tests mock electron-updater since actual updates
 * require a packaged application and update server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted() to properly define mocks that can be accessed by hoisted vi.mock factories
const mockAutoUpdater = vi.hoisted(() => ({
  autoDownload: false,
  autoInstallOnAppQuit: false,
  autoRunAppAfterInstall: false,
  on: vi.fn(),
  checkForUpdates: vi.fn().mockResolvedValue(null),
  quitAndInstall: vi.fn(),
  removeAllListeners: vi.fn(),
}));

const mockApp = vi.hoisted(() => ({
  isPackaged: true, // Simulate production mode for most tests
  getPath: vi.fn().mockReturnValue('/mock/path'),
}));

const mockWebContents = vi.hoisted(() => ({
  send: vi.fn(),
}));

const mockBrowserWindow = vi.hoisted(() => ({
  webContents: mockWebContents,
  isDestroyed: vi.fn().mockReturnValue(false),
}));

// Mock electron-updater
vi.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}));

// Mock electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  app: mockApp,
}));

// Import after mocks are set up
import {
  initAutoUpdateService,
  checkForUpdates,
  quitAndInstall,
  getUpdateStatus,
  getUpdateState,
  isUpdateReady,
  cleanupAutoUpdateService,
  stopPeriodicUpdateCheck,
  onUpdateStatusChange,
} from './auto-update-service';
import type { UpdateState, UpdateStatus } from '../../shared/types/ipc';

describe('Auto-Update Service', () => {
  let eventHandlers: Map<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset app.isPackaged to production mode
    mockApp.isPackaged = true;

    // Capture event handlers registered with autoUpdater.on
    eventHandlers = new Map();
    mockAutoUpdater.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      eventHandlers.set(event, handler);
      return mockAutoUpdater;
    });
  });

  afterEach(() => {
    cleanupAutoUpdateService();
    vi.useRealTimers();
    vi.resetModules();
  });

  describe('initAutoUpdateService', () => {
    it('should configure autoUpdater settings', () => {
      initAutoUpdateService(mockBrowserWindow as never);

      expect(mockAutoUpdater.autoDownload).toBe(true);
      expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true);
      expect(mockAutoUpdater.autoRunAppAfterInstall).toBe(true);
    });

    it('should register all event listeners', () => {
      initAutoUpdateService(mockBrowserWindow as never);

      expect(eventHandlers.has('checking-for-update')).toBe(true);
      expect(eventHandlers.has('update-available')).toBe(true);
      expect(eventHandlers.has('update-not-available')).toBe(true);
      expect(eventHandlers.has('download-progress')).toBe(true);
      expect(eventHandlers.has('update-downloaded')).toBe(true);
      expect(eventHandlers.has('error')).toBe(true);
    });

    it('should check for updates after startup delay', () => {
      initAutoUpdateService(mockBrowserWindow as never);

      expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();

      // Fast-forward past startup delay (5 seconds)
      vi.advanceTimersByTime(5000);

      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    it('should skip initialization in development mode', () => {
      mockApp.isPackaged = false;

      initAutoUpdateService(mockBrowserWindow as never);

      expect(mockAutoUpdater.on).not.toHaveBeenCalled();
    });
  });

  describe('checkForUpdates', () => {
    beforeEach(() => {
      initAutoUpdateService(mockBrowserWindow as never);
    });

    it('should call autoUpdater.checkForUpdates', async () => {
      await checkForUpdates();

      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    it('should skip check in development mode', async () => {
      mockApp.isPackaged = false;
      mockAutoUpdater.checkForUpdates.mockClear();

      await checkForUpdates();

      expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
    });
  });

  describe('quitAndInstall', () => {
    beforeEach(() => {
      initAutoUpdateService(mockBrowserWindow as never);
    });

    it('should not call autoUpdater.quitAndInstall when no update is downloaded', () => {
      quitAndInstall();

      expect(mockAutoUpdater.quitAndInstall).not.toHaveBeenCalled();
    });

    it('should call autoUpdater.quitAndInstall when update is downloaded', () => {
      // Simulate update-downloaded event
      const handler = eventHandlers.get('update-downloaded');
      if (handler) {
        handler({ version: '2.0.0', releaseDate: '2026-02-06' });
      }

      quitAndInstall();

      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
    });
  });

  describe('getUpdateStatus', () => {
    beforeEach(() => {
      initAutoUpdateService(mockBrowserWindow as never);
    });

    it('should return idle state initially', () => {
      const status = getUpdateStatus();

      expect(status.state).toBe('idle');
    });

    it('should return update info after update-available event', () => {
      const handler = eventHandlers.get('update-available');
      if (handler) {
        handler({
          version: '2.0.0',
          releaseNotes: 'New features',
          releaseDate: '2026-02-06',
        });
      }

      const status = getUpdateStatus();

      expect(status.state).toBe('update-available');
      expect(status.version).toBe('2.0.0');
      expect(status.releaseNotes).toBe('New features');
    });
  });

  describe('getUpdateState', () => {
    beforeEach(() => {
      initAutoUpdateService(mockBrowserWindow as never);
    });

    it('should return current state', () => {
      expect(getUpdateState()).toBe('idle');

      const handler = eventHandlers.get('checking-for-update');
      if (handler) handler();

      expect(getUpdateState()).toBe('checking');
    });
  });

  describe('isUpdateReady', () => {
    beforeEach(() => {
      initAutoUpdateService(mockBrowserWindow as never);
    });

    it('should return false when no update downloaded', () => {
      expect(isUpdateReady()).toBe(false);
    });

    it('should return true when update downloaded', () => {
      const handler = eventHandlers.get('update-downloaded');
      if (handler) {
        handler({ version: '2.0.0', releaseDate: '2026-02-06' });
      }

      expect(isUpdateReady()).toBe(true);
    });
  });

  describe('onUpdateStatusChange callback', () => {
    beforeEach(() => {
      initAutoUpdateService(mockBrowserWindow as never);
    });

    it('should call registered callback when state changes', () => {
      const callback = vi.fn();
      onUpdateStatusChange(callback);

      const handler = eventHandlers.get('checking-for-update');
      if (handler) handler();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'checking' })
      );
    });

    it('should not throw if no callback registered', () => {
      expect(() => {
        const handler = eventHandlers.get('checking-for-update');
        if (handler) handler();
      }).not.toThrow();
    });
  });

  describe('event handlers', () => {
    beforeEach(() => {
      initAutoUpdateService(mockBrowserWindow as never);
    });

    it('should send status to renderer on state change', () => {
      const handler = eventHandlers.get('update-available');
      if (handler) {
        handler({ version: '2.0.0', releaseNotes: 'Test', releaseDate: '2026-02-06' });
      }

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'worldkit:update:status',
        expect.objectContaining({ state: 'update-available' })
      );
    });

    it('should handle download progress', () => {
      const handler = eventHandlers.get('download-progress');
      if (handler) {
        handler({ percent: 45.7 });
      }

      const status = getUpdateStatus();
      expect(status.state).toBe('downloading');
      expect(status.progress).toBe(46); // Should be rounded
    });

    it('should transition from no-update to idle after delay', () => {
      const handler = eventHandlers.get('update-not-available');
      if (handler) {
        handler({ version: '1.0.0' });
      }

      expect(getUpdateState()).toBe('no-update');

      vi.advanceTimersByTime(3000);

      expect(getUpdateState()).toBe('idle');
    });

    it('should transition from error to idle after delay', () => {
      const handler = eventHandlers.get('error');
      if (handler) {
        handler(new Error('Network error'));
      }

      expect(getUpdateState()).toBe('error');

      vi.advanceTimersByTime(10000);

      expect(getUpdateState()).toBe('idle');
    });
  });

  describe('periodic update check', () => {
    it('should check for updates every 4 hours', () => {
      initAutoUpdateService(mockBrowserWindow as never);

      // Skip initial startup check
      vi.advanceTimersByTime(5000);
      mockAutoUpdater.checkForUpdates.mockClear();

      // 4 hours = 14400000 ms
      vi.advanceTimersByTime(4 * 60 * 60 * 1000);

      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('should stop periodic checks when stopPeriodicUpdateCheck called', () => {
      initAutoUpdateService(mockBrowserWindow as never);

      // Skip initial startup check
      vi.advanceTimersByTime(5000);
      mockAutoUpdater.checkForUpdates.mockClear();

      stopPeriodicUpdateCheck();

      vi.advanceTimersByTime(4 * 60 * 60 * 1000);

      expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
    });
  });

  describe('cleanupAutoUpdateService', () => {
    it('should stop periodic checks', () => {
      initAutoUpdateService(mockBrowserWindow as never);

      // Skip initial startup check
      vi.advanceTimersByTime(5000);
      mockAutoUpdater.checkForUpdates.mockClear();

      cleanupAutoUpdateService();

      vi.advanceTimersByTime(4 * 60 * 60 * 1000);

      expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled();
    });
  });

  describe('UpdateState type', () => {
    it('should define all expected states', () => {
      const states: UpdateState[] = [
        'idle',
        'checking',
        'update-available',
        'downloading',
        'downloaded',
        'error',
        'no-update',
      ];
      expect(states).toHaveLength(7);
    });
  });

  describe('UpdateStatus interface', () => {
    it('should have correct structure for idle state', () => {
      const status: UpdateStatus = {
        state: 'idle',
      };
      expect(status.state).toBe('idle');
      expect(status.version).toBeUndefined();
    });

    it('should have correct structure for update-available state', () => {
      const status: UpdateStatus = {
        state: 'update-available',
        version: '2.0.0',
        releaseNotes: 'New features',
        releaseDate: '2026-02-06',
      };
      expect(status.state).toBe('update-available');
      expect(status.version).toBe('2.0.0');
    });

    it('should have correct structure for downloading state', () => {
      const status: UpdateStatus = {
        state: 'downloading',
        progress: 50,
      };
      expect(status.state).toBe('downloading');
      expect(status.progress).toBe(50);
    });

    it('should have correct structure for error state', () => {
      const status: UpdateStatus = {
        state: 'error',
        error: 'Network error',
      };
      expect(status.state).toBe('error');
      expect(status.error).toBe('Network error');
    });
  });

  describe('IPC Channel Communication', () => {
    it('should define correct channel names', async () => {
      const { UpdateChannels } = await import('../../shared/ipc-channels');

      expect(UpdateChannels.STATUS).toBe('worldkit:update:status');
      expect(UpdateChannels.CHECK).toBe('worldkit:update:check');
      expect(UpdateChannels.QUIT_AND_INSTALL).toBe('worldkit:update:quitAndInstall');
      expect(UpdateChannels.GET_STATUS).toBe('worldkit:update:getStatus');
    });
  });
});
