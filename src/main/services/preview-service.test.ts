import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  launchPreview,
  getPreviewStatus,
  onPreviewStatusChange,
  resetPreviewStatus,
} from './preview-service';
import * as webverseService from './webverse-service';

// Create hoisted mocks for fs/promises
const { mockMkdir, mockWriteFile, mockReaddir, mockStat, mockUnlink } = vi.hoisted(() => ({
  mockMkdir: vi.fn().mockResolvedValue(undefined),
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
  mockReaddir: vi.fn().mockResolvedValue([]),
  mockStat: vi.fn().mockResolvedValue({ mtimeMs: Date.now() }),
  mockUnlink: vi.fn().mockResolvedValue(undefined),
}));

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp'),
  },
}));

// Create hoisted mock for child_process spawn
const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn().mockReturnValue({
    pid: 12345,
    unref: vi.fn(),
    kill: vi.fn(),
  }),
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: mockSpawn,
  default: { spawn: mockSpawn },
}));

// Mock fs/promises using hoisted mocks
vi.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  readdir: mockReaddir,
  stat: mockStat,
  unlink: mockUnlink,
  default: {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    readdir: mockReaddir,
    stat: mockStat,
    unlink: mockUnlink,
  },
}));

// Mock webverse-service
vi.mock('./webverse-service', () => ({
  getWebVerseStatus: vi.fn(),
}));

describe('preview-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPreviewStatus();
  });

  describe('launchPreview', () => {
    it('returns error if WebVerse is not installed', async () => {
      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: false,
      });

      const result = await launchPreview({
        vemlContent: '<veml></veml>',
        projectName: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.webverseNotFound).toBe(true);
      expect(result.error).toBe('WebVerse is not installed');
    });

    it('returns error if WebVerse path is not set', async () => {
      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: true,
        path: undefined,
      });

      const result = await launchPreview({
        vemlContent: '<veml></veml>',
        projectName: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.webverseNotFound).toBe(true);
    });

    it('writes VEML to temp file and launches WebVerse', async () => {
      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: true,
        path: '/usr/bin/webverse',
      });

      const result = await launchPreview({
        vemlContent: '<veml></veml>',
        projectName: 'Test Project',
      });

      expect(result.success).toBe(true);
      expect(result.processId).toBe(12345);
      expect(result.tempFilePath).toContain('.veml');
      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('sanitizes project name in filename', async () => {
      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: true,
        path: '/usr/bin/webverse',
      });

      const result = await launchPreview({
        vemlContent: '<veml></veml>',
        projectName: 'Test/Project:Name?',
      });

      expect(result.success).toBe(true);
      // The project name should be sanitized in the filename (check basename only)
      const fileName = result.tempFilePath?.split(/[/\\]/).pop() ?? '';
      expect(fileName).not.toContain('/');
      expect(fileName).not.toContain(':');
      expect(fileName).not.toContain('?');
    });

    it('uses default name if project name is not provided', async () => {
      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: true,
        path: '/usr/bin/webverse',
      });

      const result = await launchPreview({
        vemlContent: '<veml></veml>',
      });

      expect(result.success).toBe(true);
      expect(result.tempFilePath).toContain('preview_');
    });
  });

  describe('getPreviewStatus', () => {
    it('returns idle status by default', () => {
      const status = getPreviewStatus();
      expect(status.state).toBe('idle');
    });

    it('returns running status after launch', async () => {
      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: true,
        path: '/usr/bin/webverse',
      });

      await launchPreview({
        vemlContent: '<veml></veml>',
      });

      const status = getPreviewStatus();
      expect(status.state).toBe('running');
    });
  });

  describe('onPreviewStatusChange', () => {
    it('notifies listeners when status changes', async () => {
      const listener = vi.fn();
      const cleanup = onPreviewStatusChange(listener);

      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: true,
        path: '/usr/bin/webverse',
      });

      await launchPreview({
        vemlContent: '<veml></veml>',
      });

      // Should have been called for preparing, launching, and running states
      expect(listener).toHaveBeenCalled();

      cleanup();
    });

    it('cleanup function removes listener', async () => {
      const listener = vi.fn();
      const cleanup = onPreviewStatusChange(listener);
      cleanup();

      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: true,
        path: '/usr/bin/webverse',
      });

      await launchPreview({
        vemlContent: '<veml></veml>',
      });

      // Listener should not have been called after cleanup
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('resetPreviewStatus', () => {
    it('resets status to idle', async () => {
      vi.mocked(webverseService.getWebVerseStatus).mockReturnValue({
        installed: true,
        path: '/usr/bin/webverse',
      });

      await launchPreview({
        vemlContent: '<veml></veml>',
      });

      expect(getPreviewStatus().state).toBe('running');

      resetPreviewStatus();

      expect(getPreviewStatus().state).toBe('idle');
    });
  });
});
