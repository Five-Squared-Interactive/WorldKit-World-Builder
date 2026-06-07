/**
 * Network Service Tests
 *
 * Tests for the network connectivity service functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted() to properly define mocks that can be accessed by hoisted vi.mock factories
const mockNet = vi.hoisted(() => ({
  online: true,
}));

const mockWebContents = vi.hoisted(() => ({
  send: vi.fn(),
}));

const mockBrowserWindow = vi.hoisted(() => ({
  webContents: mockWebContents,
  isDestroyed: vi.fn().mockReturnValue(false),
}));

// Mock electron
vi.mock('electron', () => ({
  net: mockNet,
  BrowserWindow: vi.fn(),
}));

// Import after mocks are set up
import {
  initNetworkService,
  getNetworkStatus,
  isNetworkOnline,
  handleOnlineEvent,
  handleOfflineEvent,
  refreshNetworkStatus,
  onNetworkStatusChange,
  cleanupNetworkService,
} from './network-service';
import { NetworkChannels } from '../../shared/ipc-channels';

describe('Network Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset to online state
    mockNet.online = true;
  });

  afterEach(() => {
    cleanupNetworkService();
    vi.useRealTimers();
  });

  describe('initNetworkService', () => {
    it('should initialize with current network state', () => {
      mockNet.online = true;
      initNetworkService(mockBrowserWindow as never);

      expect(isNetworkOnline()).toBe(true);
    });

    it('should initialize as offline when net.online is false', () => {
      mockNet.online = false;
      initNetworkService(mockBrowserWindow as never);

      expect(isNetworkOnline()).toBe(false);
    });
  });

  describe('getNetworkStatus', () => {
    beforeEach(() => {
      initNetworkService(mockBrowserWindow as never);
    });

    it('should return online status', () => {
      const status = getNetworkStatus();

      expect(status).toEqual({ online: true });
    });
  });

  describe('isNetworkOnline', () => {
    beforeEach(() => {
      initNetworkService(mockBrowserWindow as never);
    });

    it('should return true when online', () => {
      expect(isNetworkOnline()).toBe(true);
    });
  });

  describe('handleOnlineEvent', () => {
    beforeEach(() => {
      mockNet.online = false;
      initNetworkService(mockBrowserWindow as never);
    });

    it('should update state to online after debounce', () => {
      handleOnlineEvent();

      // State shouldn't change immediately due to debounce
      expect(isNetworkOnline()).toBe(false);

      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);

      expect(isNetworkOnline()).toBe(true);
    });

    it('should send status to renderer after state change', () => {
      handleOnlineEvent();
      vi.advanceTimersByTime(1000);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        NetworkChannels.STATUS,
        { online: true }
      );
    });
  });

  describe('handleOfflineEvent', () => {
    beforeEach(() => {
      mockNet.online = true;
      initNetworkService(mockBrowserWindow as never);
    });

    it('should update state to offline after debounce', () => {
      handleOfflineEvent();

      // State shouldn't change immediately due to debounce
      expect(isNetworkOnline()).toBe(true);

      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);

      expect(isNetworkOnline()).toBe(false);
    });

    it('should send status to renderer after state change', () => {
      handleOfflineEvent();
      vi.advanceTimersByTime(1000);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        NetworkChannels.STATUS,
        { online: false }
      );
    });
  });

  describe('debouncing', () => {
    beforeEach(() => {
      initNetworkService(mockBrowserWindow as never);
    });

    it('should debounce rapid state changes', () => {
      // Rapid online/offline/online events
      handleOfflineEvent();
      vi.advanceTimersByTime(500); // Half of debounce time
      handleOnlineEvent();
      vi.advanceTimersByTime(500);
      handleOfflineEvent();

      // State should still be online (original state)
      expect(isNetworkOnline()).toBe(true);

      // After debounce completes, state should be offline (last event)
      vi.advanceTimersByTime(1000);
      expect(isNetworkOnline()).toBe(false);
    });

    it('should not trigger multiple status sends during rapid changes', () => {
      handleOfflineEvent();
      vi.advanceTimersByTime(500);
      handleOnlineEvent();
      vi.advanceTimersByTime(500);
      handleOfflineEvent();

      // Clear previous calls
      mockWebContents.send.mockClear();

      // Complete debounce
      vi.advanceTimersByTime(1000);

      // Should only send once (the final state)
      expect(mockWebContents.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshNetworkStatus', () => {
    beforeEach(() => {
      initNetworkService(mockBrowserWindow as never);
    });

    it('should update state when net.online changes', () => {
      mockNet.online = false;
      refreshNetworkStatus();
      vi.advanceTimersByTime(1000);

      expect(isNetworkOnline()).toBe(false);
    });

    it('should not update state when net.online unchanged', () => {
      mockWebContents.send.mockClear();
      refreshNetworkStatus();
      vi.advanceTimersByTime(1000);

      // No state change, no send
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });

  describe('onNetworkStatusChange callback', () => {
    beforeEach(() => {
      initNetworkService(mockBrowserWindow as never);
    });

    it('should call registered callback when state changes', () => {
      const callback = vi.fn();
      onNetworkStatusChange(callback);

      handleOfflineEvent();
      vi.advanceTimersByTime(1000);

      expect(callback).toHaveBeenCalledWith({ online: false });
    });

    it('should not throw if no callback registered', () => {
      expect(() => {
        handleOfflineEvent();
        vi.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  });

  describe('polling', () => {
    it('should detect network change via polling', () => {
      mockNet.online = true;
      initNetworkService(mockBrowserWindow as never);

      expect(isNetworkOnline()).toBe(true);

      // Simulate network going offline
      mockNet.online = false;

      // Advance past poll interval (5000ms)
      vi.advanceTimersByTime(5000);

      // Debounce delay
      vi.advanceTimersByTime(1000);

      expect(isNetworkOnline()).toBe(false);
    });

    it('should detect network coming back online via polling', () => {
      mockNet.online = false;
      initNetworkService(mockBrowserWindow as never);

      expect(isNetworkOnline()).toBe(false);

      // Simulate network coming back online
      mockNet.online = true;

      // Advance past poll interval + debounce
      vi.advanceTimersByTime(5000);
      vi.advanceTimersByTime(1000);

      expect(isNetworkOnline()).toBe(true);
    });

    it('should send status to renderer when polling detects change', () => {
      mockNet.online = true;
      initNetworkService(mockBrowserWindow as never);
      mockWebContents.send.mockClear();

      // Simulate network going offline
      mockNet.online = false;

      // Advance past poll interval + debounce
      vi.advanceTimersByTime(5000);
      vi.advanceTimersByTime(1000);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        NetworkChannels.STATUS,
        { online: false }
      );
    });

    it('should not send status if network state unchanged during polling', () => {
      mockNet.online = true;
      initNetworkService(mockBrowserWindow as never);
      mockWebContents.send.mockClear();

      // Advance multiple poll intervals without changing net.online
      vi.advanceTimersByTime(15000);

      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });

  describe('cleanupNetworkService', () => {
    it('should reset state to default', () => {
      mockNet.online = false;
      initNetworkService(mockBrowserWindow as never);

      cleanupNetworkService();

      // State should be reset to true (default)
      expect(isNetworkOnline()).toBe(true);
    });

    it('should clear pending debounce timeout', () => {
      initNetworkService(mockBrowserWindow as never);
      handleOfflineEvent();

      cleanupNetworkService();

      // Advancing time should not trigger the debounced callback
      mockWebContents.send.mockClear();
      vi.advanceTimersByTime(1000);

      expect(mockWebContents.send).not.toHaveBeenCalled();
    });

    it('should stop polling after cleanup', () => {
      mockNet.online = true;
      initNetworkService(mockBrowserWindow as never);

      cleanupNetworkService();
      mockWebContents.send.mockClear();

      // Simulate network change after cleanup
      mockNet.online = false;

      // Advance past multiple poll intervals
      vi.advanceTimersByTime(15000);

      // No polling should trigger state change
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });
  });
});
