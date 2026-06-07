/**
 * Export IPC Handlers Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { registerExportHandlers, unregisterExportHandlers, triggerExport } from './exportHandlers';
import { ExportChannels } from '../../shared/ipc-channels';
import * as fs from 'fs';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
  BrowserWindow: {
    getFocusedWindow: vi.fn(),
    getAllWindows: vi.fn(),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  promises: {
    writeFile: vi.fn(),
  },
}));

describe('Export Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterExportHandlers();
  });

  describe('registerExportHandlers', () => {
    it('should register VEML export handler', () => {
      registerExportHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        ExportChannels.VEML,
        expect.any(Function)
      );
    });
  });

  describe('unregisterExportHandlers', () => {
    it('should remove VEML export handler', () => {
      registerExportHandlers();
      unregisterExportHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(ExportChannels.VEML);
    });
  });

  describe('VEML export handler', () => {
    it('should show save dialog and write file on success', async () => {
      const mockWindow = {} as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/output.veml',
      });
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      registerExportHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === ExportChannels.VEML
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const result = await handler({}, { vemlContent: '<veml>test</veml>', suggestedName: 'myworld' });

      expect(dialog.showSaveDialog).toHaveBeenCalledWith(mockWindow, expect.objectContaining({
        title: 'Export VEML',
        defaultPath: 'myworld.veml',
      }));
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        '/path/to/output.veml',
        '<veml>test</veml>',
        'utf-8'
      );
      expect(result).toEqual({ success: true, path: '/path/to/output.veml' });
    });

    it('should return cancelled when dialog is cancelled', async () => {
      const mockWindow = {} as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: true,
        filePath: undefined,
      });

      registerExportHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === ExportChannels.VEML
      );
      const handler = handleCall![1];
      const result = await handler({}, { vemlContent: '<veml>test</veml>' });

      expect(result).toEqual({ success: false, cancelled: true });
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it('should add .veml extension if missing', async () => {
      const mockWindow = {} as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/output',
      });
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

      registerExportHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === ExportChannels.VEML
      );
      const handler = handleCall![1];
      const result = await handler({}, { vemlContent: '<veml>test</veml>' });

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        '/path/to/output.veml',
        '<veml>test</veml>',
        'utf-8'
      );
      expect(result.path).toBe('/path/to/output.veml');
    });

    it('should return error on write failure', async () => {
      const mockWindow = {} as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/path/to/output.veml',
      });
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('Write failed'));

      registerExportHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === ExportChannels.VEML
      );
      const handler = handleCall![1];
      const result = await handler({}, { vemlContent: '<veml>test</veml>' });

      expect(result).toEqual({ success: false, error: 'Write failed' });
    });
  });

  describe('triggerExport', () => {
    it('should send export trigger to focused window', () => {
      const mockWebContents = { send: vi.fn() };
      const mockWindow = { webContents: mockWebContents } as unknown as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);

      triggerExport();

      expect(mockWebContents.send).toHaveBeenCalledWith(ExportChannels.TRIGGER_EXPORT);
    });

    it('should do nothing if no focused window', () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);

      // Should not throw
      expect(() => triggerExport()).not.toThrow();
    });
  });
});
