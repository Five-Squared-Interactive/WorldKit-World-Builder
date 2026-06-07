/**
 * Recent Projects Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/user/data'),
  },
}));

// Import after mocks
import {
  loadRecentProjects,
  addRecentProject,
  removeRecentProject,
  clearRecentProjects,
  getRecentProjects,
} from './recent-projects-service';

describe('recent-projects-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadRecentProjects', () => {
    it('should return empty array when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = loadRecentProjects();

      expect(result).toEqual([]);
    });

    it('should parse and return projects from file', () => {
      const mockProjects = [
        { name: 'Project 1', path: '/path/to/project1.wk', lastOpened: '2026-02-09T12:00:00Z' },
        { name: 'Project 2', path: '/path/to/project2.wk', lastOpened: '2026-02-08T12:00:00Z' },
      ];

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.includes('recent-projects.json')) return true;
        if (p === '/path/to/project1.wk') return true;
        if (p === '/path/to/project2.wk') return false;
        return false;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockProjects));

      const result = loadRecentProjects();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
      expect(result[0].exists).toBe(true);
      expect(result[1].name).toBe('Project 2');
      expect(result[1].exists).toBe(false);
    });

    it('should return empty array on parse error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      const result = loadRecentProjects();

      expect(result).toEqual([]);
    });

    it('should return empty array if data is not an array', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ not: 'array' }));

      const result = loadRecentProjects();

      expect(result).toEqual([]);
    });
  });

  describe('addRecentProject', () => {
    it('should add new project to the front', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = addRecentProject('New Project', '/path/to/new.wk');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('New Project');
      expect(result[0].path).toBe('/path/to/new.wk');
      expect(result[0].exists).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should move existing project to front', () => {
      const existingProjects = [
        { name: 'Project 1', path: '/path/to/project1.wk', lastOpened: '2026-02-08T12:00:00Z' },
        { name: 'Project 2', path: '/path/to/project2.wk', lastOpened: '2026-02-07T12:00:00Z' },
      ];

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.includes('recent-projects.json')) return true;
        return true;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingProjects));

      const result = addRecentProject('Project 2', '/path/to/project2.wk');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 2'); // Moved to front
      expect(result[1].name).toBe('Project 1');
    });

    it('should limit to 10 projects', () => {
      const existingProjects = Array.from({ length: 10 }, (_, i) => ({
        name: `Project ${i}`,
        path: `/path/to/project${i}.wk`,
        lastOpened: '2026-02-08T12:00:00Z',
      }));

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.includes('recent-projects.json')) return true;
        return true;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingProjects));

      const result = addRecentProject('New Project', '/path/to/new.wk');

      expect(result).toHaveLength(10);
      expect(result[0].name).toBe('New Project');
      expect(result[9].name).toBe('Project 8'); // Project 9 was pushed out
    });
  });

  describe('removeRecentProject', () => {
    it('should remove project from list', () => {
      const existingProjects = [
        { name: 'Project 1', path: '/path/to/project1.wk', lastOpened: '2026-02-08T12:00:00Z' },
        { name: 'Project 2', path: '/path/to/project2.wk', lastOpened: '2026-02-07T12:00:00Z' },
      ];

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.includes('recent-projects.json')) return true;
        return true;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingProjects));

      const result = removeRecentProject('/path/to/project1.wk');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Project 2');
    });

    it('should return unchanged list if path not found', () => {
      const existingProjects = [
        { name: 'Project 1', path: '/path/to/project1.wk', lastOpened: '2026-02-08T12:00:00Z' },
      ];

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.includes('recent-projects.json')) return true;
        return true;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingProjects));

      const result = removeRecentProject('/path/to/nonexistent.wk');

      expect(result).toHaveLength(1);
    });
  });

  describe('clearRecentProjects', () => {
    it('should save empty array', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      clearRecentProjects();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('recent-projects.json'),
        '[]',
        'utf-8'
      );
    });
  });

  describe('getRecentProjects', () => {
    it('should return loaded projects', () => {
      const mockProjects = [
        { name: 'Project 1', path: '/path/to/project1.wk', lastOpened: '2026-02-09T12:00:00Z' },
      ];

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.includes('recent-projects.json')) return true;
        return true;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockProjects));

      const result = getRecentProjects();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Project 1');
    });
  });
});
