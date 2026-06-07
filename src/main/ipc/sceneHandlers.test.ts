/**
 * Scene Handlers Tests
 *
 * Tests for scene-related IPC handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import { SceneChannels } from '../../shared/ipc-channels';
import { sendAddPrimitiveEvent } from './sceneHandlers';

// Mock Electron
vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(),
  },
}));

describe('Scene Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendAddPrimitiveEvent', () => {
    it('should send add-primitive event with cube type to all windows', () => {
      const mockWebContents = {
        send: vi.fn(),
      };
      const mockWindow = {
        webContents: mockWebContents,
      };
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
        mockWindow as unknown as BrowserWindow,
      ]);

      sendAddPrimitiveEvent('cube');

      expect(mockWebContents.send).toHaveBeenCalledWith(
        SceneChannels.ADD_PRIMITIVE,
        'cube'
      );
    });

    it('should send add-primitive event with sphere type to all windows', () => {
      const mockWebContents = {
        send: vi.fn(),
      };
      const mockWindow = {
        webContents: mockWebContents,
      };
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
        mockWindow as unknown as BrowserWindow,
      ]);

      sendAddPrimitiveEvent('sphere');

      expect(mockWebContents.send).toHaveBeenCalledWith(
        SceneChannels.ADD_PRIMITIVE,
        'sphere'
      );
    });

    it('should send add-primitive event with plane type to all windows', () => {
      const mockWebContents = {
        send: vi.fn(),
      };
      const mockWindow = {
        webContents: mockWebContents,
      };
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
        mockWindow as unknown as BrowserWindow,
      ]);

      sendAddPrimitiveEvent('plane');

      expect(mockWebContents.send).toHaveBeenCalledWith(
        SceneChannels.ADD_PRIMITIVE,
        'plane'
      );
    });

    it('should send event to multiple windows', () => {
      const mockWebContents1 = { send: vi.fn() };
      const mockWebContents2 = { send: vi.fn() };
      const mockWindow1 = { webContents: mockWebContents1 };
      const mockWindow2 = { webContents: mockWebContents2 };
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([
        mockWindow1 as unknown as BrowserWindow,
        mockWindow2 as unknown as BrowserWindow,
      ]);

      sendAddPrimitiveEvent('cube');

      expect(mockWebContents1.send).toHaveBeenCalledWith(
        SceneChannels.ADD_PRIMITIVE,
        'cube'
      );
      expect(mockWebContents2.send).toHaveBeenCalledWith(
        SceneChannels.ADD_PRIMITIVE,
        'cube'
      );
    });

    it('should handle no windows gracefully', () => {
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([]);

      expect(() => sendAddPrimitiveEvent('cube')).not.toThrow();
    });
  });
});
