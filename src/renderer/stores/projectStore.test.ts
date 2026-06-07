import { describe, it, expect, beforeEach } from 'vitest';
import {
  useProjectStore,
  selectHasBeenSaved,
  selectNeedsSavePrompt,
  selectFileName,
  type ProjectMetadata,
  type RecentProject,
} from './projectStore';

describe('projectStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useProjectStore.getState().newProject();
    useProjectStore.setState({ recentProjects: [] });
  });

  describe('initial state', () => {
    it('starts with default metadata', () => {
      const state = useProjectStore.getState();
      expect(state.metadata.name).toBe('Untitled World');
      expect(state.metadata.path).toBeNull();
      expect(state.metadata.lastSaved).toBeNull();
    });

    it('starts as new project', () => {
      const state = useProjectStore.getState();
      expect(state.isNew).toBe(true);
    });

    it('starts not dirty', () => {
      const state = useProjectStore.getState();
      expect(state.isDirty).toBe(false);
    });

    it('starts with empty recent projects', () => {
      const state = useProjectStore.getState();
      expect(state.recentProjects).toEqual([]);
    });
  });

  describe('setProject', () => {
    it('sets project metadata', () => {
      const metadata: ProjectMetadata = {
        name: 'My World',
        path: '/path/to/project.worldkit',
        lastSaved: new Date(),
        description: 'A test world',
        author: 'Test Author',
      };

      useProjectStore.getState().setProject(metadata);

      const state = useProjectStore.getState();
      expect(state.metadata.name).toBe('My World');
      expect(state.metadata.path).toBe('/path/to/project.worldkit');
    });

    it('marks project as not new when loaded', () => {
      const metadata: ProjectMetadata = {
        name: 'Existing World',
        path: '/path/to/project.worldkit',
        lastSaved: new Date(),
        description: '',
        author: '',
      };

      useProjectStore.getState().setProject(metadata, false);

      const state = useProjectStore.getState();
      expect(state.isNew).toBe(false);
    });

    it('marks project as not dirty when set', () => {
      useProjectStore.getState().markDirty();
      const metadata: ProjectMetadata = {
        name: 'Loaded World',
        path: '/path/to/project.worldkit',
        lastSaved: new Date(),
        description: '',
        author: '',
      };

      useProjectStore.getState().setProject(metadata);

      const state = useProjectStore.getState();
      expect(state.isDirty).toBe(false);
    });
  });

  describe('updateMetadata', () => {
    it('updates specific metadata fields', () => {
      useProjectStore.getState().updateMetadata({ name: 'Updated Name' });

      const state = useProjectStore.getState();
      expect(state.metadata.name).toBe('Updated Name');
    });

    it('preserves other metadata fields', () => {
      useProjectStore.getState().updateMetadata({
        description: 'Initial Description',
      });
      useProjectStore.getState().updateMetadata({ name: 'Updated Name' });

      const state = useProjectStore.getState();
      expect(state.metadata.name).toBe('Updated Name');
      expect(state.metadata.description).toBe('Initial Description');
    });

    it('marks project as dirty', () => {
      useProjectStore.getState().updateMetadata({ name: 'Changed' });

      const state = useProjectStore.getState();
      expect(state.isDirty).toBe(true);
    });
  });

  describe('markDirty', () => {
    it('sets isDirty to true', () => {
      useProjectStore.getState().markDirty();

      const state = useProjectStore.getState();
      expect(state.isDirty).toBe(true);
    });
  });

  describe('markClean', () => {
    it('sets isDirty to false', () => {
      useProjectStore.getState().markDirty();
      useProjectStore.getState().markClean();

      const state = useProjectStore.getState();
      expect(state.isDirty).toBe(false);
    });

    it('sets isNew to false', () => {
      useProjectStore.getState().markClean();

      const state = useProjectStore.getState();
      expect(state.isNew).toBe(false);
    });

    it('updates lastSaved timestamp', () => {
      const savedAt = new Date('2026-01-15T10:00:00Z');
      useProjectStore.getState().markClean(savedAt);

      const state = useProjectStore.getState();
      expect(state.metadata.lastSaved).toEqual(savedAt);
    });

    it('uses current date if no timestamp provided', () => {
      const before = new Date();
      useProjectStore.getState().markClean();
      const after = new Date();

      const state = useProjectStore.getState();
      expect(state.metadata.lastSaved).not.toBeNull();
      expect(state.metadata.lastSaved!.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(state.metadata.lastSaved!.getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });
  });

  describe('recentProjects', () => {
    const recentProject: RecentProject = {
      name: 'Test Project',
      path: '/path/to/project.worldkit',
      lastOpened: new Date(),
    };

    describe('addRecentProject', () => {
      it('adds project to recent list', () => {
        useProjectStore.getState().addRecentProject(recentProject);

        const state = useProjectStore.getState();
        expect(state.recentProjects).toHaveLength(1);
        expect(state.recentProjects[0].name).toBe('Test Project');
      });

      it('adds new projects to front of list', () => {
        const project1: RecentProject = {
          name: 'First',
          path: '/first.worldkit',
          lastOpened: new Date(),
        };
        const project2: RecentProject = {
          name: 'Second',
          path: '/second.worldkit',
          lastOpened: new Date(),
        };

        useProjectStore.getState().addRecentProject(project1);
        useProjectStore.getState().addRecentProject(project2);

        const state = useProjectStore.getState();
        expect(state.recentProjects[0].name).toBe('Second');
        expect(state.recentProjects[1].name).toBe('First');
      });

      it('removes duplicate paths', () => {
        const project1: RecentProject = {
          name: 'Original',
          path: '/same/path.worldkit',
          lastOpened: new Date('2026-01-01'),
        };
        const project2: RecentProject = {
          name: 'Updated',
          path: '/same/path.worldkit',
          lastOpened: new Date('2026-01-15'),
        };

        useProjectStore.getState().addRecentProject(project1);
        useProjectStore.getState().addRecentProject(project2);

        const state = useProjectStore.getState();
        expect(state.recentProjects).toHaveLength(1);
        expect(state.recentProjects[0].name).toBe('Updated');
      });

      it('limits to max recent projects', () => {
        for (let i = 0; i < 15; i++) {
          useProjectStore.getState().addRecentProject({
            name: `Project ${i}`,
            path: `/project${i}.worldkit`,
            lastOpened: new Date(),
          });
        }

        const state = useProjectStore.getState();
        expect(state.recentProjects).toHaveLength(10);
      });
    });

    describe('removeRecentProject', () => {
      it('removes project by path', () => {
        useProjectStore.getState().addRecentProject(recentProject);
        useProjectStore.getState().removeRecentProject(recentProject.path);

        const state = useProjectStore.getState();
        expect(state.recentProjects).toHaveLength(0);
      });

      it('does not affect other projects', () => {
        const project1: RecentProject = {
          name: 'Keep',
          path: '/keep.worldkit',
          lastOpened: new Date(),
        };
        const project2: RecentProject = {
          name: 'Remove',
          path: '/remove.worldkit',
          lastOpened: new Date(),
        };

        useProjectStore.getState().addRecentProject(project1);
        useProjectStore.getState().addRecentProject(project2);
        useProjectStore.getState().removeRecentProject('/remove.worldkit');

        const state = useProjectStore.getState();
        expect(state.recentProjects).toHaveLength(1);
        expect(state.recentProjects[0].name).toBe('Keep');
      });
    });

    describe('clearRecentProjects', () => {
      it('clears all recent projects', () => {
        useProjectStore.getState().addRecentProject(recentProject);
        useProjectStore.getState().clearRecentProjects();

        const state = useProjectStore.getState();
        expect(state.recentProjects).toHaveLength(0);
      });
    });
  });

  describe('newProject', () => {
    it('resets to default metadata', () => {
      useProjectStore.getState().updateMetadata({ name: 'Custom Name' });
      useProjectStore.getState().newProject();

      const state = useProjectStore.getState();
      expect(state.metadata.name).toBe('Untitled World');
    });

    it('marks as new project', () => {
      useProjectStore.getState().markClean();
      useProjectStore.getState().newProject();

      const state = useProjectStore.getState();
      expect(state.isNew).toBe(true);
    });

    it('marks as not dirty', () => {
      useProjectStore.getState().markDirty();
      useProjectStore.getState().newProject();

      const state = useProjectStore.getState();
      expect(state.isDirty).toBe(false);
    });
  });

  describe('getDisplayTitle', () => {
    it('returns project name', () => {
      const title = useProjectStore.getState().getDisplayTitle();

      expect(title).toBe('Untitled World');
    });

    it('adds asterisk when dirty', () => {
      useProjectStore.getState().markDirty();

      const title = useProjectStore.getState().getDisplayTitle();

      expect(title).toBe('Untitled World *');
    });

    it('uses custom project name', () => {
      useProjectStore.getState().updateMetadata({ name: 'My Cool World' });
      useProjectStore.setState({ isDirty: false }); // Reset dirty from update

      const title = useProjectStore.getState().getDisplayTitle();

      expect(title).toBe('My Cool World');
    });
  });

  describe('selectors', () => {
    describe('selectHasBeenSaved', () => {
      it('returns false for new project', () => {
        const result = selectHasBeenSaved(useProjectStore.getState());

        expect(result).toBe(false);
      });

      it('returns true when path is set', () => {
        useProjectStore.getState().setProject({
          name: 'Saved',
          path: '/saved.worldkit',
          lastSaved: new Date(),
          description: '',
          author: '',
        });

        const result = selectHasBeenSaved(useProjectStore.getState());

        expect(result).toBe(true);
      });
    });

    describe('selectNeedsSavePrompt', () => {
      it('returns true when dirty', () => {
        useProjectStore.getState().markDirty();

        const result = selectNeedsSavePrompt(useProjectStore.getState());

        expect(result).toBe(true);
      });

      it('returns true when new', () => {
        const result = selectNeedsSavePrompt(useProjectStore.getState());

        expect(result).toBe(true);
      });

      it('returns false when clean and not new', () => {
        useProjectStore.getState().setProject(
          {
            name: 'Saved',
            path: '/saved.worldkit',
            lastSaved: new Date(),
            description: '',
            author: '',
          },
          false
        );

        const result = selectNeedsSavePrompt(useProjectStore.getState());

        expect(result).toBe(false);
      });
    });

    describe('selectFileName', () => {
      it('returns null when no path', () => {
        const result = selectFileName(useProjectStore.getState());

        expect(result).toBeNull();
      });

      it('extracts filename from path', () => {
        useProjectStore.getState().setProject({
          name: 'Test',
          path: '/path/to/project.worldkit',
          lastSaved: new Date(),
          description: '',
          author: '',
        });

        const result = selectFileName(useProjectStore.getState());

        expect(result).toBe('project.worldkit');
      });

      it('handles Windows paths', () => {
        useProjectStore.getState().setProject({
          name: 'Test',
          path: 'C:\\Users\\test\\project.worldkit',
          lastSaved: new Date(),
          description: '',
          author: '',
        });

        const result = selectFileName(useProjectStore.getState());

        expect(result).toBe('project.worldkit');
      });
    });
  });
});
