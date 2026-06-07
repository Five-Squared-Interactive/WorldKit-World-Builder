/**
 * Update IPC Handlers Tests
 *
 * Tests for the update-related IPC handlers.
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

const mockCheckForUpdates = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockQuitAndInstall = vi.hoisted(() => vi.fn());
const mockGetUpdateStatus = vi.hoisted(() => vi.fn().mockReturnValue({ state: 'idle' }));

// Mock electron
vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
}));

// Mock auto-update-service
vi.mock('../services/auto-update-service', () => ({
  checkForUpdates: mockCheckForUpdates,
  quitAndInstall: mockQuitAndInstall,
  getUpdateStatus: mockGetUpdateStatus,
}));

// Import after mocks are set up
import { registerUpdateHandlers, unregisterUpdateHandlers } from './updateHandlers';
import { UpdateChannels } from '../../shared/ipc-channels';

describe('Update IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIpcMainHandlers.clear();
  });

  afterEach(() => {
    unregisterUpdateHandlers();
  });

  describe('registerUpdateHandlers', () => {
    it('should register all update handlers', () => {
      registerUpdateHandlers();

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        UpdateChannels.CHECK,
        expect.any(Function)
      );
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        UpdateChannels.GET_STATUS,
        expect.any(Function)
      );
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        UpdateChannels.QUIT_AND_INSTALL,
        expect.any(Function)
      );
    });
  });

  describe('unregisterUpdateHandlers', () => {
    it('should remove all update handlers', () => {
      registerUpdateHandlers();
      unregisterUpdateHandlers();

      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(UpdateChannels.CHECK);
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(UpdateChannels.GET_STATUS);
      expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(UpdateChannels.QUIT_AND_INSTALL);
    });
  });

  describe('CHECK handler', () => {
    it('should call checkForUpdates and return status', async () => {
      const expectedStatus = { state: 'update-available', version: '2.0.0' };
      mockGetUpdateStatus.mockReturnValue(expectedStatus);

      registerUpdateHandlers();

      const handler = mockIpcMainHandlers.get(UpdateChannels.CHECK);
      expect(handler).toBeDefined();

      const result = await handler!();

      expect(mockCheckForUpdates).toHaveBeenCalled();
      expect(result).toEqual(expectedStatus);
    });
  });

  describe('GET_STATUS handler', () => {
    it('should return current update status', () => {
      const expectedStatus = { state: 'idle' };
      mockGetUpdateStatus.mockReturnValue(expectedStatus);

      registerUpdateHandlers();

      const handler = mockIpcMainHandlers.get(UpdateChannels.GET_STATUS);
      expect(handler).toBeDefined();

      const result = handler!();

      expect(result).toEqual(expectedStatus);
    });
  });

  describe('QUIT_AND_INSTALL handler', () => {
    it('should call quitAndInstall and return true', () => {
      registerUpdateHandlers();

      const handler = mockIpcMainHandlers.get(UpdateChannels.QUIT_AND_INSTALL);
      expect(handler).toBeDefined();

      const result = handler!();

      expect(mockQuitAndInstall).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
