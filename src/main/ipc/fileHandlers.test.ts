/**
 * File Handlers Tests
 *
 * Tests for file IPC handlers including model import functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import { registerFileHandlers, unregisterFileHandlers } from './fileHandlers';
import { FileChannels } from '../../shared/ipc-channels';

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

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  accessSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
  constants: { R_OK: 4 },
}));

describe('fileHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterFileHandlers();
  });

  describe('registerFileHandlers', () => {
    it('should register import model handler', () => {
      registerFileHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        FileChannels.IMPORT_MODEL,
        expect.any(Function)
      );
    });

    it('should register read file base64 handler', () => {
      registerFileHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        FileChannels.READ_FILE_BASE64,
        expect.any(Function)
      );
    });
  });

  describe('unregisterFileHandlers', () => {
    it('should remove all file handlers', () => {
      registerFileHandlers();
      unregisterFileHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(FileChannels.IMPORT_MODEL);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(FileChannels.READ_FILE_BASE64);
    });
  });

  describe('IMPORT_MODEL handler', () => {
    let importModelHandler: () => Promise<unknown>;

    beforeEach(() => {
      registerFileHandlers();
      // Get the handler that was registered
      const calls = vi.mocked(ipcMain.handle).mock.calls;
      const importCall = calls.find((call) => call[0] === FileChannels.IMPORT_MODEL);
      importModelHandler = importCall?.[1] as () => Promise<unknown>;
    });

    it('should return cancelled when dialog is cancelled', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const result = await importModelHandler();

      expect(result).toEqual({ success: false, cancelled: true });
    });

    it('should return error for non-existent file', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['C:/path/to/missing.glb'],
      });
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await importModelHandler();

      expect(result).toEqual({
        success: false,
        error: 'File does not exist',
      });
    });

    it('should return error for unsupported file type', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['C:/path/to/model.obj'],
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await importModelHandler();

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Unsupported file type'),
      });
    });

    it('should return success for valid GLB file', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['C:/path/to/model.glb'],
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockReturnValue(undefined);
      vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as fs.Stats);

      const result = await importModelHandler();

      expect(result).toEqual({
        success: true,
        filePath: 'C:/path/to/model.glb',
        fileName: 'model.glb',
      });
    });

    it('should return success for valid GLTF file', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['C:/path/to/model.gltf'],
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockReturnValue(undefined);
      vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as fs.Stats);

      const result = await importModelHandler();

      expect(result).toEqual({
        success: true,
        filePath: 'C:/path/to/model.gltf',
        fileName: 'model.gltf',
      });
    });

    it('should return error for file larger than 100MB', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['C:/path/to/large.glb'],
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockReturnValue(undefined);
      vi.mocked(fs.statSync).mockReturnValue({ size: 150 * 1024 * 1024 } as fs.Stats); // 150MB

      const result = await importModelHandler();

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('too large'),
      });
    });
  });

  describe('READ_FILE_BASE64 handler', () => {
    let readFileHandler: (_event: unknown, filePath: string) => Promise<unknown>;

    beforeEach(() => {
      registerFileHandlers();
      // Get the handler that was registered
      const calls = vi.mocked(ipcMain.handle).mock.calls;
      const readCall = calls.find((call) => call[0] === FileChannels.READ_FILE_BASE64);
      readFileHandler = readCall?.[1] as (_event: unknown, filePath: string) => Promise<unknown>;
    });

    it('should return error for invalid file path', async () => {
      const result = await readFileHandler({}, '');

      expect(result).toEqual({
        success: false,
        error: 'Invalid file path',
      });
    });

    it('should return error for non-model files', async () => {
      const result = await readFileHandler({}, 'C:/path/to/file.txt');

      expect(result).toEqual({
        success: false,
        error: 'Only 3D model files can be read',
      });
    });

    it('should return base64 data for valid GLB file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockReturnValue(undefined);
      vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('test data'));

      const result = await readFileHandler({}, 'C:/path/to/model.glb');

      expect(result).toEqual({
        success: true,
        data: Buffer.from('test data').toString('base64'),
        mimeType: 'model/gltf-binary',
      });
    });

    it('should return correct MIME type for GLTF files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.accessSync).mockReturnValue(undefined);
      vi.mocked(fs.statSync).mockReturnValue({ size: 1024 } as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('{"asset":{}}'));

      const result = await readFileHandler({}, 'C:/path/to/model.gltf');

      expect(result).toEqual({
        success: true,
        data: expect.any(String),
        mimeType: 'model/gltf+json',
      });
    });
  });
});
