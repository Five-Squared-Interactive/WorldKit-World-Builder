/**
 * Template Handlers Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import { registerTemplateHandlers, unregisterTemplateHandlers } from './templateHandlers';
import { TemplateChannels } from '../../shared/ipc-channels';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  app: {
    isPackaged: false,
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn(),
}));

describe('templateHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterTemplateHandlers();
  });

  describe('registerTemplateHandlers', () => {
    it('should register LIST handler', () => {
      registerTemplateHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        TemplateChannels.LIST,
        expect.any(Function)
      );
    });

    it('should register LOAD handler', () => {
      registerTemplateHandlers();

      expect(ipcMain.handle).toHaveBeenCalledWith(
        TemplateChannels.LOAD,
        expect.any(Function)
      );
    });
  });

  describe('unregisterTemplateHandlers', () => {
    it('should remove all template handlers', () => {
      registerTemplateHandlers();
      unregisterTemplateHandlers();

      expect(ipcMain.removeHandler).toHaveBeenCalledWith(TemplateChannels.LIST);
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(TemplateChannels.LOAD);
    });
  });

  describe('LIST handler', () => {
    it('should return list of bundled templates', () => {
      registerTemplateHandlers();

      // Get the handler function
      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === TemplateChannels.LIST
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1] as () => { success: boolean; templates?: unknown[] };
      const result = handler();

      expect(result.success).toBe(true);
      expect(result.templates).toBeDefined();
      expect(result.templates!.length).toBe(4);

      // Verify template IDs
      const templateIds = result.templates!.map((t: { id: string }) => t.id);
      expect(templateIds).toContain('empty');
      expect(templateIds).toContain('room');
      expect(templateIds).toContain('park');
      expect(templateIds).toContain('gallery');
    });
  });

  describe('LOAD handler', () => {
    it('should return error for unknown template', () => {
      registerTemplateHandlers();

      // Get the handler function
      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === TemplateChannels.LOAD
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1] as (
        event: unknown,
        id: string
      ) => { success: boolean; error?: string };
      const result = handler({}, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should return default entities when template file does not exist', () => {
      registerTemplateHandlers();

      // Get the handler function
      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === TemplateChannels.LOAD
      );
      expect(handleCall).toBeDefined();

      const handler = handleCall![1] as (
        event: unknown,
        id: string
      ) => { success: boolean; data?: { entities: unknown[]; suggestedName: string } };
      const result = handler({}, 'empty');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.entities).toBeDefined();
      expect(result.data!.entities.length).toBeGreaterThan(0);
      expect(result.data!.suggestedName).toBe('New Empty World');
    });

    it('should create room template with walls and floor', () => {
      registerTemplateHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === TemplateChannels.LOAD
      );
      const handler = handleCall![1] as (
        event: unknown,
        id: string
      ) => { success: boolean; data?: { entities: { name: string }[] } };
      const result = handler({}, 'room');

      expect(result.success).toBe(true);
      const entityNames = result.data!.entities.map((e) => e.name);
      expect(entityNames).toContain('Floor');
      expect(entityNames).toContain('Back Wall');
    });

    it('should create park template with trees and grass', () => {
      registerTemplateHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === TemplateChannels.LOAD
      );
      const handler = handleCall![1] as (
        event: unknown,
        id: string
      ) => { success: boolean; data?: { entities: { name: string }[] } };
      const result = handler({}, 'park');

      expect(result.success).toBe(true);
      const entityNames = result.data!.entities.map((e) => e.name);
      expect(entityNames).toContain('Grass');
      expect(entityNames).toContain('Tree Trunk');
    });

    it('should create gallery template with pedestals', () => {
      registerTemplateHandlers();

      const handleCall = vi.mocked(ipcMain.handle).mock.calls.find(
        (call) => call[0] === TemplateChannels.LOAD
      );
      const handler = handleCall![1] as (
        event: unknown,
        id: string
      ) => { success: boolean; data?: { entities: { name: string }[] } };
      const result = handler({}, 'gallery');

      expect(result.success).toBe(true);
      const entityNames = result.data!.entities.map((e) => e.name);
      expect(entityNames).toContain('Pedestal 1');
      expect(entityNames).toContain('Pedestal 2');
    });
  });
});
