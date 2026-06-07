/**
 * Network IPC Handlers Tests
 *
 * Tests for the network-related IPC handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted() to properly define mocks that can be accessed by hoisted vi.mock factories
const mockIpcMainHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

const mockIpcMain = vi.hoisted(() => ({
  handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
    mockIpcMainHandlers.set(channel, handler);
  }),
  removeHandler: vi.fn((channel: string) => {
    mockIpcMainHandlers.delete(channel);
  }),
}));

const mockGetNetworkStatus = vi.hoisted(() => vi.fn().mockReturnValue({ online: true }));

// Mock electron
vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
}));

// Mock network-service
vi.mock('../services/network-service', () => ({
  getNetworkStatus: mockGetNetworkStatus,
}));

// Import after mocks are set up
import { registerNetworkHandlers, unregisterNetworkHandlers } from './networkHandlers';
import { NetworkChannels } from '../../shared/ipc-channels';

describe('Network IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIpcMainHandlers.clear();
  });

  afterEach(() => {
    unregisterNetworkHandlers();
  });

  describe('registerNetworkHandlers', () => {
    it('should register GET_STATUS handler', () => {
      registerNetworkHandlers();

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        NetworkChannels.GET_STATUS,
        expect.any(Function)
      );
    });
  });

  describe('unregisterNetworkHandlers', () => {
    it('should remove GET_STATUS handler', () => {
      registerNetworkHandlers();
      unregisterNetworkHandlers();

      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(NetworkChannels.GET_STATUS);
    });
  });

  describe('GET_STATUS handler', () => {
    it('should return current network status', () => {
      const expectedStatus = { online: true };
      mockGetNetworkStatus.mockReturnValue(expectedStatus);

      registerNetworkHandlers();

      const handler = mockIpcMainHandlers.get(NetworkChannels.GET_STATUS);
      expect(handler).toBeDefined();

      const result = handler!();

      expect(mockGetNetworkStatus).toHaveBeenCalled();
      expect(result).toEqual(expectedStatus);
    });

    it('should return offline status when network is offline', () => {
      const expectedStatus = { online: false };
      mockGetNetworkStatus.mockReturnValue(expectedStatus);

      registerNetworkHandlers();

      const handler = mockIpcMainHandlers.get(NetworkChannels.GET_STATUS);
      const result = handler!();

      expect(result).toEqual(expectedStatus);
    });
  });
});
