import { describe, it, expect } from 'vitest';
import { SystemChannels, FileChannels, ProjectChannels, Channels } from './ipc-channels';

describe('IPC Channels', () => {
  describe('Channel Naming Pattern', () => {
    it('follows worldkit:{domain}:{action} pattern for system channels', () => {
      expect(SystemChannels.GET_APP_VERSION).toBe('worldkit:system:getAppVersion');
      expect(SystemChannels.GET_PLATFORM).toBe('worldkit:system:getPlatform');
      expect(SystemChannels.GET_APP_PATH).toBe('worldkit:system:getAppPath');
    });

    it('follows worldkit:{domain}:{action} pattern for file channels', () => {
      expect(FileChannels.READ).toBe('worldkit:file:read');
      expect(FileChannels.WRITE).toBe('worldkit:file:write');
      expect(FileChannels.EXISTS).toBe('worldkit:file:exists');
      expect(FileChannels.SHOW_SAVE_DIALOG).toBe('worldkit:file:showSaveDialog');
      expect(FileChannels.SHOW_OPEN_DIALOG).toBe('worldkit:file:showOpenDialog');
    });

    it('follows worldkit:{domain}:{action} pattern for project channels', () => {
      expect(ProjectChannels.NEW).toBe('worldkit:project:new');
      expect(ProjectChannels.OPEN).toBe('worldkit:project:open');
      expect(ProjectChannels.SAVE).toBe('worldkit:project:save');
      expect(ProjectChannels.SAVE_AS).toBe('worldkit:project:saveAs');
      expect(ProjectChannels.GET_RECENT).toBe('worldkit:project:getRecent');
    });
  });

  describe('Channels namespace', () => {
    it('exports all channel groups', () => {
      expect(Channels.System).toBe(SystemChannels);
      expect(Channels.File).toBe(FileChannels);
      expect(Channels.Project).toBe(ProjectChannels);
    });
  });

  describe('Channel uniqueness', () => {
    it('has no duplicate channel names', () => {
      const allChannels = [
        ...Object.values(SystemChannels),
        ...Object.values(FileChannels),
        ...Object.values(ProjectChannels),
      ];

      const uniqueChannels = new Set(allChannels);
      expect(uniqueChannels.size).toBe(allChannels.length);
    });
  });
});
