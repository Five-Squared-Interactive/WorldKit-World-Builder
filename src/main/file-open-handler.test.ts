/**
 * File Open Handler Tests
 *
 * Unit tests for file association handling logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import {
  isValidFileExtension,
  extractFilePathFromArgs,
  handleFileOpen,
  getPendingFilePath,
  setPendingFilePath,
  sanitizeFilePath,
} from './file-open-handler';
import { FileOpenChannels } from '../shared/ipc-channels';

// Mock electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  dialog: {
    showErrorBox: vi.fn(),
  },
}));

// Mock fs module
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

describe('file-open-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear any pending file path
    getPendingFilePath();
  });

  describe('isValidFileExtension', () => {
    it('accepts .worldkit files', () => {
      expect(isValidFileExtension('/path/to/project.worldkit')).toBe(true);
      expect(isValidFileExtension('C:\\Users\\test\\project.worldkit')).toBe(true);
    });

    it('accepts .veml files', () => {
      expect(isValidFileExtension('/path/to/world.veml')).toBe(true);
      expect(isValidFileExtension('C:\\Users\\test\\world.veml')).toBe(true);
    });

    it('rejects other extensions', () => {
      expect(isValidFileExtension('/path/to/file.txt')).toBe(false);
      expect(isValidFileExtension('/path/to/file.json')).toBe(false);
      expect(isValidFileExtension('/path/to/file.exe')).toBe(false);
      expect(isValidFileExtension('/path/to/file')).toBe(false);
    });

    it('is case-insensitive for extensions', () => {
      expect(isValidFileExtension('/path/to/project.WORLDKIT')).toBe(true);
      expect(isValidFileExtension('/path/to/project.WorldKit')).toBe(true);
      expect(isValidFileExtension('/path/to/world.VEML')).toBe(true);
      expect(isValidFileExtension('/path/to/world.Veml')).toBe(true);
    });

    it('handles paths with multiple dots', () => {
      expect(isValidFileExtension('/path/to/my.project.worldkit')).toBe(true);
      expect(isValidFileExtension('/path/to/my.world.veml')).toBe(true);
    });

    it('handles empty and edge case paths', () => {
      expect(isValidFileExtension('')).toBe(false);
      // Files with only extension are technically valid but unusual
      // path.extname('.worldkit') returns '' because it treats it as a dotfile
      expect(isValidFileExtension('.worldkit')).toBe(false);
      expect(isValidFileExtension('.veml')).toBe(false);
      // But with any prefix, they work correctly
      expect(isValidFileExtension('a.worldkit')).toBe(true);
      expect(isValidFileExtension('a.veml')).toBe(true);
    });
  });

  describe('extractFilePathFromArgs', () => {
    it('extracts .worldkit path from args', () => {
      const args = ['electron', '.', '/path/to/project.worldkit'];
      expect(extractFilePathFromArgs(args)).toBe('/path/to/project.worldkit');
    });

    it('extracts .veml path from args', () => {
      const args = ['electron', '.', '/path/to/world.veml'];
      expect(extractFilePathFromArgs(args)).toBe('/path/to/world.veml');
    });

    it('returns first valid file when multiple present', () => {
      const args = ['electron', '/first.worldkit', '/second.veml'];
      expect(extractFilePathFromArgs(args)).toBe('/first.worldkit');
    });

    it('returns null when no valid file in args', () => {
      const args = ['electron', '.', '--some-flag', '--another-flag'];
      expect(extractFilePathFromArgs(args)).toBeNull();
    });

    it('returns null for empty args', () => {
      expect(extractFilePathFromArgs([])).toBeNull();
    });

    it('ignores non-file arguments', () => {
      const args = ['electron', '--inspect', '--enable-logging', 'project.worldkit'];
      expect(extractFilePathFromArgs(args)).toBe('project.worldkit');
    });

    it('handles Windows-style paths', () => {
      const args = ['WorldKit.exe', 'C:\\Users\\test\\project.worldkit'];
      expect(extractFilePathFromArgs(args)).toBe('C:\\Users\\test\\project.worldkit');
    });
  });

  describe('sanitizeFilePath', () => {
    it('returns resolved absolute path for valid paths', () => {
      const result = sanitizeFilePath('/path/to/file.worldkit');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('returns null for empty string', () => {
      expect(sanitizeFilePath('')).toBeNull();
    });

    it('returns null for null bytes in path', () => {
      expect(sanitizeFilePath('/path/to/file\0.worldkit')).toBeNull();
    });

    it('returns null for non-string input', () => {
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(sanitizeFilePath(null)).toBeNull();
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(sanitizeFilePath(undefined)).toBeNull();
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(sanitizeFilePath(123)).toBeNull();
    });

    it('normalizes paths with ..', () => {
      const result = sanitizeFilePath('/path/to/../file.worldkit');
      expect(result).toBeTruthy();
      // The path should be normalized
      expect(result).not.toContain('..');
    });
  });

  describe('getPendingFilePath and setPendingFilePath', () => {
    it('returns null when no pending file', () => {
      expect(getPendingFilePath()).toBeNull();
    });

    it('returns and clears pending file path', () => {
      setPendingFilePath('/path/to/file.worldkit');
      expect(getPendingFilePath()).toBe('/path/to/file.worldkit');
      // Should be cleared after getting
      expect(getPendingFilePath()).toBeNull();
    });

    it('overwrites previous pending file', () => {
      setPendingFilePath('/path/to/first.worldkit');
      setPendingFilePath('/path/to/second.worldkit');
      expect(getPendingFilePath()).toBe('/path/to/second.worldkit');
    });
  });

  describe('handleFileOpen', () => {
    let mockWindow: {
      webContents: { send: ReturnType<typeof vi.fn> };
      isMinimized: ReturnType<typeof vi.fn>;
      restore: ReturnType<typeof vi.fn>;
      show: ReturnType<typeof vi.fn>;
      focus: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockWindow = {
        webContents: { send: vi.fn() },
        isMinimized: vi.fn().mockReturnValue(false),
        restore: vi.fn(),
        show: vi.fn(),
        focus: vi.fn(),
      };
    });

    it('shows error for invalid file extension', () => {
      handleFileOpen('/path/to/file.txt', mockWindow as unknown as BrowserWindow);

      expect(dialog.showErrorBox).toHaveBeenCalledWith(
        'Invalid File',
        expect.stringContaining('cannot open files')
      );
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('shows error for non-existent file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      handleFileOpen('/path/to/missing.worldkit', mockWindow as unknown as BrowserWindow);

      expect(dialog.showErrorBox).toHaveBeenCalledWith(
        'File Not Found',
        expect.stringContaining('could not be found')
      );
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('sends PROJECT channel for .worldkit files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      handleFileOpen('/path/to/project.worldkit', mockWindow as unknown as BrowserWindow);

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        FileOpenChannels.PROJECT,
        expect.stringContaining('project.worldkit')
      );
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('sends VEML channel for .veml files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      handleFileOpen('/path/to/world.veml', mockWindow as unknown as BrowserWindow);

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        FileOpenChannels.VEML,
        expect.stringContaining('world.veml')
      );
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('restores window if minimized', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      mockWindow.isMinimized.mockReturnValue(true);

      handleFileOpen('/path/to/project.worldkit', mockWindow as unknown as BrowserWindow);

      expect(mockWindow.restore).toHaveBeenCalled();
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('stores pending file when window is null', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      handleFileOpen('/path/to/project.worldkit', null);

      const pendingPath = getPendingFilePath();
      expect(pendingPath).toBeTruthy();
      expect(pendingPath).toContain('project.worldkit');
    });

    it('handles case-insensitive extensions correctly', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      handleFileOpen('/path/to/project.WORLDKIT', mockWindow as unknown as BrowserWindow);

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        FileOpenChannels.PROJECT,
        expect.stringContaining('project.WORLDKIT')
      );
    });
  });
});
