/**
 * New Project Logic Tests
 *
 * Tests for creating new blank worlds.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { createBlankWorld, hasUnsavedChanges, handleNewProject } from './newProject';
import type { Entity } from '../../types/entity';

// Mock the worldkit API
const mockShowUnsavedChangesDialog = vi.fn();

vi.stubGlobal('window', {
  worldkit: {
    project: {
      showUnsavedChangesDialog: mockShowUnsavedChangesDialog,
    },
  },
});

describe('newProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up non-empty state for tests
    const testEntity: Entity = {
      id: 'test-entity-1',
      name: 'Test Cube',
      type: 'mesh',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      parentId: null,
      childIds: [],
      visible: true,
      locked: false,
    };

    useSceneStore.setState({
      entities: { 'test-entity-1': testEntity },
      rootIds: ['test-entity-1'],
    });

    useProjectStore.setState({
      metadata: {
        name: 'Test Project',
        path: '/path/to/test.wk',
        lastSaved: new Date('2026-01-01'),
        description: 'A test project',
        author: 'Test Author',
      },
      isNew: false,
      isDirty: true,
      recentProjects: [],
    });
  });

  afterEach(() => {
    // Reset stores to initial state
    useSceneStore.getState().clearScene();
    useProjectStore.getState().newProject();
  });

  describe('createBlankWorld', () => {
    it('should clear scene store entities', () => {
      // Verify pre-condition
      expect(Object.keys(useSceneStore.getState().entities)).toHaveLength(1);

      createBlankWorld();

      const state = useSceneStore.getState();
      expect(state.entities).toEqual({});
      expect(state.rootIds).toEqual([]);
    });

    it('should reset project metadata to default', () => {
      createBlankWorld();

      const state = useProjectStore.getState();
      expect(state.metadata.name).toBe('Untitled World');
      expect(state.metadata.path).toBeNull();
      expect(state.metadata.lastSaved).toBeNull();
    });

    it('should mark project as new', () => {
      createBlankWorld();

      const state = useProjectStore.getState();
      expect(state.isNew).toBe(true);
    });

    it('should mark project as not dirty', () => {
      createBlankWorld();

      const state = useProjectStore.getState();
      expect(state.isDirty).toBe(false);
    });
  });

  describe('hasUnsavedChanges', () => {
    it('should return true when project is dirty', () => {
      useProjectStore.setState({ isDirty: true });

      expect(hasUnsavedChanges()).toBe(true);
    });

    it('should return false when project is not dirty', () => {
      useProjectStore.setState({ isDirty: false });

      expect(hasUnsavedChanges()).toBe(false);
    });
  });

  describe('handleNewProject', () => {
    it('should create new project without dialog when no unsaved changes', async () => {
      useProjectStore.setState({ isDirty: false });

      const result = await handleNewProject();

      expect(result).toBe(true);
      expect(mockShowUnsavedChangesDialog).not.toHaveBeenCalled();
      expect(useSceneStore.getState().entities).toEqual({});
      expect(useProjectStore.getState().metadata.name).toBe('Untitled World');
    });

    it('should show dialog when there are unsaved changes', async () => {
      useProjectStore.setState({ isDirty: true });
      mockShowUnsavedChangesDialog.mockResolvedValue('discard');

      await handleNewProject();

      expect(mockShowUnsavedChangesDialog).toHaveBeenCalled();
    });

    it('should create new project when user chooses discard', async () => {
      useProjectStore.setState({ isDirty: true });
      mockShowUnsavedChangesDialog.mockResolvedValue('discard');

      const result = await handleNewProject();

      expect(result).toBe(true);
      expect(useSceneStore.getState().entities).toEqual({});
    });

    it('should create new project when user chooses save (save not implemented)', async () => {
      useProjectStore.setState({ isDirty: true });
      mockShowUnsavedChangesDialog.mockResolvedValue('save');

      const result = await handleNewProject();

      expect(result).toBe(true);
      expect(useSceneStore.getState().entities).toEqual({});
    });

    it('should NOT create new project when user chooses cancel', async () => {
      useProjectStore.setState({ isDirty: true });
      mockShowUnsavedChangesDialog.mockResolvedValue('cancel');

      const result = await handleNewProject();

      expect(result).toBe(false);
      // Scene should still have the entity
      expect(Object.keys(useSceneStore.getState().entities)).toHaveLength(1);
      // Project name should be unchanged
      expect(useProjectStore.getState().metadata.name).toBe('Test Project');
    });
  });
});
