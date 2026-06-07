/**
 * Deep Link Handler Tests
 *
 * Unit tests for deep link URL parsing and handling logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import {
  parseDeepLink,
  extractDeepLinkFromArgs,
  handleDeepLinkAction,
  getPendingDeepLink,
  setPendingDeepLink,
} from './deep-link-handler';
import { DeepLinkChannels } from '../shared/ipc-channels';

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

// Mock file-open-handler
vi.mock('./file-open-handler', () => ({
  sanitizeFilePath: vi.fn((path: string) => {
    // Simple mock: return null for null bytes, otherwise return the path
    if (!path || typeof path !== 'string' || path.includes('\0')) {
      return null;
    }
    return path;
  }),
  isValidFileExtension: vi.fn((path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    return ext === 'worldkit' || ext === 'veml';
  }),
}));

describe('deep-link-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear any pending deep link
    getPendingDeepLink();
  });

  describe('parseDeepLink', () => {
    describe('worldkit://open?file=path', () => {
      it('parses file path correctly', () => {
        const result = parseDeepLink('worldkit://open?file=/path/to/project.worldkit');
        expect(result.type).toBe('open-file');
        expect(result.filePath).toBe('/path/to/project.worldkit');
      });

      it('handles Windows-style paths', () => {
        const result = parseDeepLink('worldkit://open?file=C:\\Users\\test\\project.worldkit');
        expect(result.type).toBe('open-file');
        expect(result.filePath).toBe('C:\\Users\\test\\project.worldkit');
      });

      it('decodes URL-encoded file paths', () => {
        const result = parseDeepLink('worldkit://open?file=/path/to/My%20Project.worldkit');
        expect(result.type).toBe('open-file');
        expect(result.filePath).toBe('/path/to/My Project.worldkit');
      });

      it('decodes special characters in paths', () => {
        const result = parseDeepLink('worldkit://open?file=/path/with%23special%26chars.worldkit');
        expect(result.type).toBe('open-file');
        expect(result.filePath).toBe('/path/with#special&chars.worldkit');
      });

      it('returns error for missing file parameter', () => {
        const result = parseDeepLink('worldkit://open');
        expect(result.type).toBe('unknown');
        expect(result.error).toContain('file');
      });

      it('returns error for empty file parameter', () => {
        const result = parseDeepLink('worldkit://open?file=');
        expect(result.type).toBe('unknown');
        expect(result.error).toContain('file');
      });
    });

    describe('worldkit://template/name', () => {
      it('parses template name correctly', () => {
        const result = parseDeepLink('worldkit://template/cozy-hangout');
        expect(result.type).toBe('open-template');
        expect(result.templateName).toBe('cozy-hangout');
      });

      it('handles underscores in template names', () => {
        const result = parseDeepLink('worldkit://template/my_template_v2');
        expect(result.type).toBe('open-template');
        expect(result.templateName).toBe('my_template_v2');
      });

      it('handles numeric template names', () => {
        const result = parseDeepLink('worldkit://template/template123');
        expect(result.type).toBe('open-template');
        expect(result.templateName).toBe('template123');
      });

      it('returns error for missing template name', () => {
        const result = parseDeepLink('worldkit://template/');
        expect(result.type).toBe('unknown');
        expect(result.error).toContain('template');
      });

      it('returns error for empty template name', () => {
        const result = parseDeepLink('worldkit://template');
        expect(result.type).toBe('unknown');
        expect(result.error).toContain('template');
      });
    });

    describe('error cases', () => {
      it('returns error for unknown actions', () => {
        const result = parseDeepLink('worldkit://unknown-action');
        expect(result.type).toBe('unknown');
        expect(result.error).toContain('Unknown action');
      });

      it('returns error for malformed URLs', () => {
        const result = parseDeepLink('not-a-valid-url');
        expect(result.type).toBe('unknown');
        expect(result.error).toBe('Malformed URL');
      });

      it('returns error for wrong protocol', () => {
        const result = parseDeepLink('http://example.com');
        expect(result.type).toBe('unknown');
        expect(result.error).toBe('Unknown protocol');
      });

      it('rejects null bytes in URL', () => {
        const result = parseDeepLink('worldkit://open?file=/path\0/to/file.worldkit');
        expect(result.type).toBe('unknown');
        expect(result.error).toContain('Invalid');
      });

      it('returns error for null input', () => {
        // @ts-expect-error Testing runtime behavior with invalid input
        const result = parseDeepLink(null);
        expect(result.type).toBe('unknown');
        expect(result.error).toBe('Invalid URL');
      });

      it('returns error for undefined input', () => {
        // @ts-expect-error Testing runtime behavior with invalid input
        const result = parseDeepLink(undefined);
        expect(result.type).toBe('unknown');
        expect(result.error).toBe('Invalid URL');
      });

      it('returns error for non-string input', () => {
        // @ts-expect-error Testing runtime behavior with invalid input
        const result = parseDeepLink(123);
        expect(result.type).toBe('unknown');
        expect(result.error).toBe('Invalid URL');
      });

      it('returns error for empty string', () => {
        const result = parseDeepLink('');
        expect(result.type).toBe('unknown');
        expect(result.error).toBe('Invalid URL');
      });
    });
  });

  describe('extractDeepLinkFromArgs', () => {
    it('extracts deep link from args', () => {
      const args = ['WorldKit.exe', 'worldkit://template/gallery'];
      expect(extractDeepLinkFromArgs(args)).toBe('worldkit://template/gallery');
    });

    it('extracts open file deep link from args', () => {
      const args = ['WorldKit.exe', 'worldkit://open?file=/path/to/file.worldkit'];
      expect(extractDeepLinkFromArgs(args)).toBe('worldkit://open?file=/path/to/file.worldkit');
    });

    it('returns first deep link when multiple present', () => {
      const args = ['WorldKit.exe', 'worldkit://template/first', 'worldkit://template/second'];
      expect(extractDeepLinkFromArgs(args)).toBe('worldkit://template/first');
    });

    it('returns null when no deep link present', () => {
      const args = ['WorldKit.exe', '--some-flag', '/path/to/file.worldkit'];
      expect(extractDeepLinkFromArgs(args)).toBeNull();
    });

    it('returns null for empty args', () => {
      expect(extractDeepLinkFromArgs([])).toBeNull();
    });

    it('finds deep link among other arguments', () => {
      const args = ['WorldKit.exe', '--debug', '--enable-logging', 'worldkit://template/room', '--verbose'];
      expect(extractDeepLinkFromArgs(args)).toBe('worldkit://template/room');
    });
  });

  describe('getPendingDeepLink and setPendingDeepLink', () => {
    it('returns null when no pending link', () => {
      expect(getPendingDeepLink()).toBeNull();
    });

    it('returns and clears pending deep link', () => {
      setPendingDeepLink('worldkit://template/test');
      expect(getPendingDeepLink()).toBe('worldkit://template/test');
      // Should be cleared after getting
      expect(getPendingDeepLink()).toBeNull();
    });

    it('overwrites previous pending link', () => {
      setPendingDeepLink('worldkit://template/first');
      setPendingDeepLink('worldkit://template/second');
      expect(getPendingDeepLink()).toBe('worldkit://template/second');
    });
  });

  describe('handleDeepLinkAction', () => {
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

    describe('unknown actions', () => {
      it('shows error dialog for unknown action type', () => {
        handleDeepLinkAction({ type: 'unknown', error: 'Test error' }, mockWindow as unknown as BrowserWindow);

        expect(dialog.showErrorBox).toHaveBeenCalledWith(
          'Invalid Link',
          'Test error'
        );
        expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('shows default error message when no error provided', () => {
        handleDeepLinkAction({ type: 'unknown' }, mockWindow as unknown as BrowserWindow);

        expect(dialog.showErrorBox).toHaveBeenCalledWith(
          'Invalid Link',
          'WorldKit could not process this link.'
        );
      });
    });

    describe('open-file action', () => {
      it('sends OPEN_FILE channel for valid file', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        handleDeepLinkAction(
          { type: 'open-file', filePath: '/path/to/project.worldkit' },
          mockWindow as unknown as BrowserWindow
        );

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          DeepLinkChannels.OPEN_FILE,
          '/path/to/project.worldkit'
        );
        expect(mockWindow.show).toHaveBeenCalled();
        expect(mockWindow.focus).toHaveBeenCalled();
      });

      it('shows error for non-existent file', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        handleDeepLinkAction(
          { type: 'open-file', filePath: '/path/to/missing.worldkit' },
          mockWindow as unknown as BrowserWindow
        );

        expect(dialog.showErrorBox).toHaveBeenCalledWith(
          'File Not Found',
          expect.stringContaining('could not be found')
        );
        expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('shows error for unsupported file extension', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        handleDeepLinkAction(
          { type: 'open-file', filePath: '/path/to/file.txt' },
          mockWindow as unknown as BrowserWindow
        );

        expect(dialog.showErrorBox).toHaveBeenCalledWith(
          'Unsupported File',
          expect.stringContaining('.worldkit')
        );
        expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('restores window if minimized', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        mockWindow.isMinimized.mockReturnValue(true);

        handleDeepLinkAction(
          { type: 'open-file', filePath: '/path/to/project.worldkit' },
          mockWindow as unknown as BrowserWindow
        );

        expect(mockWindow.restore).toHaveBeenCalled();
        expect(mockWindow.show).toHaveBeenCalled();
        expect(mockWindow.focus).toHaveBeenCalled();
      });
    });

    describe('open-template action', () => {
      it('sends OPEN_TEMPLATE channel for valid template', () => {
        handleDeepLinkAction(
          { type: 'open-template', templateName: 'cozy-hangout' },
          mockWindow as unknown as BrowserWindow
        );

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          DeepLinkChannels.OPEN_TEMPLATE,
          'cozy-hangout'
        );
        expect(mockWindow.show).toHaveBeenCalled();
        expect(mockWindow.focus).toHaveBeenCalled();
      });

      it('shows error for template name with special characters', () => {
        handleDeepLinkAction(
          { type: 'open-template', templateName: 'invalid/template' },
          mockWindow as unknown as BrowserWindow
        );

        expect(dialog.showErrorBox).toHaveBeenCalledWith(
          'Invalid Template',
          expect.stringContaining('invalid characters')
        );
        expect(mockWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('shows error for template name with spaces', () => {
        handleDeepLinkAction(
          { type: 'open-template', templateName: 'invalid template' },
          mockWindow as unknown as BrowserWindow
        );

        expect(dialog.showErrorBox).toHaveBeenCalledWith(
          'Invalid Template',
          expect.stringContaining('invalid characters')
        );
      });

      it('allows alphanumeric template names with hyphens and underscores', () => {
        handleDeepLinkAction(
          { type: 'open-template', templateName: 'My_Template-v2' },
          mockWindow as unknown as BrowserWindow
        );

        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          DeepLinkChannels.OPEN_TEMPLATE,
          'My_Template-v2'
        );
      });
    });

    describe('null window handling', () => {
      it('does not crash when window is null for open-file', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        // Should not throw
        handleDeepLinkAction(
          { type: 'open-file', filePath: '/path/to/project.worldkit' },
          null
        );

        expect(dialog.showErrorBox).not.toHaveBeenCalled();
      });

      it('does not crash when window is null for open-template', () => {
        // Should not throw
        handleDeepLinkAction(
          { type: 'open-template', templateName: 'test-template' },
          null
        );

        expect(dialog.showErrorBox).not.toHaveBeenCalled();
      });
    });
  });
});
