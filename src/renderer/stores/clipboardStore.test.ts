/**
 * Clipboard Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useClipboardStore } from './clipboardStore';
import { useSceneStore } from './sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('clipboardStore', () => {
  beforeEach(() => {
    // Reset stores before each test
    useClipboardStore.setState({ clipboard: null });
    useSceneStore.setState({ entities: {}, rootIds: [] });
  });

  describe('copyEntities', () => {
    it('should copy a single entity to clipboard', () => {
      const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      useClipboardStore.getState().copyEntities(['entity-1']);

      const clipboard = useClipboardStore.getState().clipboard;
      expect(clipboard).not.toBeNull();
      expect(clipboard?.operation).toBe('copy');
      expect(clipboard?.rootIds).toContain('entity-1');
      expect(clipboard?.entities).toHaveLength(1);
      expect(clipboard?.entities[0].entity.name).toBe('Cube 1');
    });

    it('should copy multiple entities to clipboard', () => {
      const entity1 = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
      const entity2 = createEntity('entity-2', 'Sphere 1', EntityType.SphereMesh);
      useSceneStore.getState().addEntity(entity1);
      useSceneStore.getState().addEntity(entity2);

      useClipboardStore.getState().copyEntities(['entity-1', 'entity-2']);

      const clipboard = useClipboardStore.getState().clipboard;
      expect(clipboard?.entities).toHaveLength(2);
      expect(clipboard?.rootIds).toEqual(['entity-1', 'entity-2']);
    });

    it('should copy entity with children', () => {
      const group = createEntity('group-1', 'Group 1', EntityType.Group);
      const child = createEntity('child-1', 'Child Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(group);
      useSceneStore.getState().addEntity(child, 'group-1');

      useClipboardStore.getState().copyEntities(['group-1']);

      const clipboard = useClipboardStore.getState().clipboard;
      expect(clipboard?.entities).toHaveLength(2);
      expect(clipboard?.rootIds).toEqual(['group-1']);
    });

    it('should filter out descendants when both parent and child are selected', () => {
      const group = createEntity('group-1', 'Group 1', EntityType.Group);
      const child = createEntity('child-1', 'Child Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(group);
      useSceneStore.getState().addEntity(child, 'group-1');

      // Select both parent and child
      useClipboardStore.getState().copyEntities(['group-1', 'child-1']);

      const clipboard = useClipboardStore.getState().clipboard;
      // Root IDs should only include the top-level entity
      expect(clipboard?.rootIds).toEqual(['group-1']);
      // But all entities should be serialized
      expect(clipboard?.entities).toHaveLength(2);
    });
  });

  describe('setForCut', () => {
    it('should set clipboard for cut operation', () => {
      const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      useClipboardStore.getState().setForCut(['entity-1']);

      const clipboard = useClipboardStore.getState().clipboard;
      expect(clipboard?.operation).toBe('cut');
      expect(clipboard?.sourceIds).toContain('entity-1');
    });
  });

  describe('clear', () => {
    it('should clear the clipboard', () => {
      const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useClipboardStore.getState().copyEntities(['entity-1']);

      useClipboardStore.getState().clear();

      expect(useClipboardStore.getState().clipboard).toBeNull();
    });
  });

  describe('hasContent', () => {
    it('should return false when clipboard is empty', () => {
      expect(useClipboardStore.getState().hasContent()).toBe(false);
    });

    it('should return true when clipboard has content', () => {
      const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useClipboardStore.getState().copyEntities(['entity-1']);

      expect(useClipboardStore.getState().hasContent()).toBe(true);
    });
  });
});
