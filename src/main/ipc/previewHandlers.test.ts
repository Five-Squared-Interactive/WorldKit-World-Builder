import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { PreviewChannels } from '../../shared/ipc-channels';
import { registerPreviewHandlers, unregisterPreviewHandlers } from './previewHandlers';
import * as previewService from '../services/preview-service';

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
}));

// Mock preview-service
vi.mock('../services/preview-service', () => ({
  launchPreview: vi.fn(),
  onPreviewStatusChange: vi.fn().mockReturnValue(() => {}),
}));

describe('previewHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterPreviewHandlers();
  });

  describe('registerPreviewHandlers', () => {
    it('registers handler for LAUNCH channel', () => {
      registerPreviewHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        PreviewChannels.LAUNCH,
        expect.any(Function)
      );
    });

    it('subscribes to preview status changes', () => {
      registerPreviewHandlers();

      expect(previewService.onPreviewStatusChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('unregisterPreviewHandlers', () => {
    it('removes handler for LAUNCH channel', () => {
      registerPreviewHandlers();
      unregisterPreviewHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(PreviewChannels.LAUNCH);
    });
  });

  describe('LAUNCH handler', () => {
    it('calls launchPreview with request', async () => {
      vi.mocked(previewService.launchPreview).mockResolvedValue({
        success: true,
        processId: 12345,
        tempFilePath: '/tmp/preview.veml',
      });

      registerPreviewHandlers();

      // Get the handler that was registered
      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === PreviewChannels.LAUNCH
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1];
      const request = { vemlContent: '<veml></veml>', projectName: 'Test' };
      const result = await handler({} as Electron.IpcMainInvokeEvent, request);

      expect(previewService.launchPreview).toHaveBeenCalledWith(request);
      expect(result.success).toBe(true);
    });
  });
});
