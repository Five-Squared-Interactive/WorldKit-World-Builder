/**
 * Project Handlers Tests
 *
 * Tests for project-related IPC handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, ipcMain, dialog } from 'electron';
import { ProjectChannels } from '../../shared/ipc-channels';
import {
  registerProjectHandlers,
  unregisterProjectHandlers,
  sendNewProjectEvent,
  showUnsavedChangesDialog,
} from './projectHandlers';

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(),
    getFocusedWindow: vi.fn(),
  },
  dialog: {
    showMessageBox: vi.fn(),
  },
}));

describe('Project Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterProjectHandlers();
  });

  describe('registerProjectHandlers', () => {
    it('should register handler for project:new channel', () => {
      registerProjectHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        ProjectChannels.NEW,
        expect.any(Function)
      );
    });

    it('should register handler for project:showUnsavedDialog channel', () => {
      registerProjectHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        ProjectChannels.SHOW_UNSAVED_DIALOG,
        expect.any(Function)
      );
    });
  });

  describe('unregisterProjectHandlers', () => {
    it('should remove handler for project:new channel', () => {
      registerProjectHandlers();
      unregisterProjectHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(ProjectChannels.NEW);
    });

    it('should remove handler for project:showUnsavedDialog channel', () => {
      registerProjectHandlers();
      unregisterProjectHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(ProjectChannels.SHOW_UNSAVED_DIALOG);
    });
  });

  describe('sendNewProjectEvent', () => {
    it('should send new project event to all windows', () => {
      const mockWebContents = {
        send: vi.fn(),
      };
      const mockWindow = {
        webContents: mockWebContents,
      };
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow as unknown as BrowserWindow]);

      sendNewProjectEvent();

      expect(mockWebContents.send).toHaveBeenCalledWith(ProjectChannels.NEW);
    });

    it('should handle no windows gracefully', () => {
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([]);

      expect(() => sendNewProjectEvent()).not.toThrow();
    });
  });

  describe('showUnsavedChangesDialog', () => {
    it('should show dialog with save/discard/cancel options', async () => {
      const mockWindow = {} as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(mockWindow);
      vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 0, checkboxChecked: false });

      const result = await showUnsavedChangesDialog();

      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        mockWindow,
        expect.objectContaining({
          type: 'question',
          buttons: ['Save', "Don't Save", 'Cancel'],
          message: expect.any(String),
        })
      );
      expect(result).toBe('save');
    });

    it('should return "discard" when user clicks Don\'t Save', async () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue({} as BrowserWindow);
      vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 1, checkboxChecked: false });

      const result = await showUnsavedChangesDialog();

      expect(result).toBe('discard');
    });

    it('should return "cancel" when user clicks Cancel', async () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue({} as BrowserWindow);
      vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 2, checkboxChecked: false });

      const result = await showUnsavedChangesDialog();

      expect(result).toBe('cancel');
    });

    it('should fallback to first window when no focused window', async () => {
      const mockWindow = {} as BrowserWindow;
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([mockWindow]);
      vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 0, checkboxChecked: false });

      const result = await showUnsavedChangesDialog();

      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        mockWindow,
        expect.objectContaining({
          type: 'question',
        })
      );
      expect(result).toBe('save');
    });

    it('should show standalone dialog when no windows available', async () => {
      vi.mocked(BrowserWindow.getFocusedWindow).mockReturnValue(null);
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([]);
      vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 1, checkboxChecked: false });

      const result = await showUnsavedChangesDialog();

      // Should be called with just options (no window)
      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'question',
        })
      );
      expect(result).toBe('discard');
    });
  });
});
