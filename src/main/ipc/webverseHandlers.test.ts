/**
 * WebVerse IPC Handlers Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { registerWebVerseHandlers, unregisterWebVerseHandlers } from './webverseHandlers';
import { WebVerseChannels } from '../../shared/ipc-channels';
import * as webverseService from '../services/webverse-service';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn(),
  },
}));

// Mock webverse-service
vi.mock('../services/webverse-service', () => ({
  detectWebVerse: vi.fn(),
  getWebVerseStatus: vi.fn(),
  setCustomWebVersePath: vi.fn(),
}));

describe('WebVerse Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterWebVerseHandlers();
  });

  describe('registerWebVerseHandlers', () => {
    it('should register detect handler', () => {
      registerWebVerseHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        WebVerseChannels.DETECT,
        expect.any(Function)
      );
    });

    it('should register getStatus handler', () => {
      registerWebVerseHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        WebVerseChannels.GET_STATUS,
        expect.any(Function)
      );
    });

    it('should register browse handler', () => {
      registerWebVerseHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        WebVerseChannels.BROWSE,
        expect.any(Function)
      );
    });

    it('should register setPath handler', () => {
      registerWebVerseHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        WebVerseChannels.SET_PATH,
        expect.any(Function)
      );
    });
  });

  describe('unregisterWebVerseHandlers', () => {
    it('should remove all handlers', () => {
      registerWebVerseHandlers();
      unregisterWebVerseHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(WebVerseChannels.DETECT);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(WebVerseChannels.GET_STATUS);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(WebVerseChannels.BROWSE);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(WebVerseChannels.SET_PATH);
    });
  });

  describe('handler callbacks', () => {
    it('detect handler should call detectWebVerse', () => {
      const mockResult = { installed: true, path: '/path/to/webverse', type: 'desktop' as const };
      vi.mocked(webverseService.detectWebVerse).mockReturnValue(mockResult);

      registerWebVerseHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === WebVerseChannels.DETECT
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const result = handler();

      expect(webverseService.detectWebVerse).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('getStatus handler should call getWebVerseStatus', () => {
      const mockResult = { installed: false };
      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue(mockResult);

      registerWebVerseHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === WebVerseChannels.GET_STATUS
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const result = handler();

      expect(webverseService.getWebVerseStatus).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('setPath handler should call setCustomWebVersePath', () => {
      const mockResult = { installed: true, path: '/custom/path', type: 'runtime' as const };
      vi.mocked(webverseService.setCustomWebVersePath).mockReturnValue(mockResult);

      registerWebVerseHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === WebVerseChannels.SET_PATH
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const result = handler({}, '/custom/path');

      expect(webverseService.setCustomWebVersePath).toHaveBeenCalledWith('/custom/path');
      expect(result).toEqual(mockResult);
    });

    it('browse handler should show open dialog', async () => {
      const mockWindow = {} as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/selected/webverse'],
      });
      vi.mocked(webverseService.setCustomWebVersePath).mockReturnValue({
        installed: true,
        path: '/selected/webverse',
        type: 'desktop',
      });

      registerWebVerseHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === WebVerseChannels.BROWSE
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const result = await handler();

      expect(dialog.showOpenDialog).toHaveBeenCalled();
      expect(result).toEqual({ success: true, path: '/selected/webverse' });
    });

    it('browse handler should return cancelled when dialog is cancelled', async () => {
      const mockWindow = {} as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      registerWebVerseHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === WebVerseChannels.BROWSE
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const result = await handler();

      expect(result).toEqual({ success: false, cancelled: true });
    });
  });
});
