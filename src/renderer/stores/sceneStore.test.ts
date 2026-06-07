import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore, selectEntityCount, selectEntityExists } from './sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('sceneStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useSceneStore.setState({ entities: {}, rootIds: [] });
  });

  describe('initial state', () => {
    it('starts with empty entities', () => {
      const state = useSceneStore.getState();
      expect(state.entities).toEqual({});
    });

    it('starts with empty rootIds', () => {
      const state = useSceneStore.getState();
      expect(state.rootIds).toEqual([]);
    });
  });

  describe('addEntity', () => {
    it('adds entity to entities map', () => {
      const entity = createEntity('1', 'Test Cube', EntityType.CubeMesh);

      useSceneStore.getState().addEntity(entity);

      const state = useSceneStore.getState();
      expect(state.entities['1']).toBeDefined();
      expect(state.entities['1'].name).toBe('Test Cube');
    });

    it('adds root entity to rootIds', () => {
      const entity = createEntity('1', 'Test Cube', EntityType.CubeMesh);

      useSceneStore.getState().addEntity(entity);

      const state = useSceneStore.getState();
      expect(state.rootIds).toContain('1');
    });

    it('adds child entity to parent childIds', () => {
      const parent = createEntity('parent', 'Parent Group', EntityType.Group);
      const child = createEntity('child', 'Child Mesh', EntityType.Mesh);

      useSceneStore.getState().addEntity(parent);
      useSceneStore.getState().addEntity(child, 'parent');

      const state = useSceneStore.getState();
      expect(state.entities['parent'].childIds).toContain('child');
      expect(state.entities['child'].parentId).toBe('parent');
      expect(state.rootIds).not.toContain('child');
    });

    it('sets parentId on child entity', () => {
      const parent = createEntity('parent', 'Parent', EntityType.Group);
      const child = createEntity('child', 'Child', EntityType.Mesh);

      useSceneStore.getState().addEntity(parent);
      useSceneStore.getState().addEntity(child, 'parent');

      const state = useSceneStore.getState();
      expect(state.entities['child'].parentId).toBe('parent');
    });
  });

  describe('removeEntity', () => {
    it('removes entity from entities map', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity);

      useSceneStore.getState().removeEntity('1');

      const state = useSceneStore.getState();
      expect(state.entities['1']).toBeUndefined();
    });

    it('removes entity from rootIds', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity);

      useSceneStore.getState().removeEntity('1');

      const state = useSceneStore.getState();
      expect(state.rootIds).not.toContain('1');
    });

    it('removes entity from parent childIds', () => {
      const parent = createEntity('parent', 'Parent', EntityType.Group);
      const child = createEntity('child', 'Child', EntityType.Mesh);
      useSceneStore.getState().addEntity(parent);
      useSceneStore.getState().addEntity(child, 'parent');

      useSceneStore.getState().removeEntity('child');

      const state = useSceneStore.getState();
      expect(state.entities['parent'].childIds).not.toContain('child');
    });

    it('removes all descendants when removing parent', () => {
      const parent = createEntity('parent', 'Parent', EntityType.Group);
      const child = createEntity('child', 'Child', EntityType.Group);
      const grandchild = createEntity('grandchild', 'Grandchild', EntityType.Mesh);

      useSceneStore.getState().addEntity(parent);
      useSceneStore.getState().addEntity(child, 'parent');
      useSceneStore.getState().addEntity(grandchild, 'child');

      useSceneStore.getState().removeEntity('parent');

      const state = useSceneStore.getState();
      expect(state.entities['parent']).toBeUndefined();
      expect(state.entities['child']).toBeUndefined();
      expect(state.entities['grandchild']).toBeUndefined();
    });

    it('does nothing for non-existent entity', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity);

      useSceneStore.getState().removeEntity('non-existent');

      const state = useSceneStore.getState();
      expect(state.entities['1']).toBeDefined();
    });
  });

  describe('updateEntity', () => {
    it('updates entity properties', () => {
      const entity = createEntity('1', 'Original', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity);

      useSceneStore.getState().updateEntity('1', { name: 'Updated' });

      const state = useSceneStore.getState();
      expect(state.entities['1'].name).toBe('Updated');
    });

    it('preserves unchanged properties', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh, {
        visible: true,
        locked: false,
      });
      useSceneStore.getState().addEntity(entity);

      useSceneStore.getState().updateEntity('1', { locked: true });

      const state = useSceneStore.getState();
      expect(state.entities['1'].visible).toBe(true);
      expect(state.entities['1'].locked).toBe(true);
    });

    it('prevents overwriting entity id', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity);

      // Attempt to change ID (should be ignored)
      useSceneStore.getState().updateEntity('1', { id: 'new-id' } as Partial<typeof entity>);

      const state = useSceneStore.getState();
      expect(state.entities['1']).toBeDefined();
      expect(state.entities['1'].id).toBe('1');
    });

    it('does nothing for non-existent entity', () => {
      useSceneStore.getState().updateEntity('non-existent', { name: 'Test' });

      const state = useSceneStore.getState();
      expect(Object.keys(state.entities)).toHaveLength(0);
    });
  });

  describe('clearScene', () => {
    it('removes all entities', () => {
      const entity1 = createEntity('1', 'Test 1', EntityType.Mesh);
      const entity2 = createEntity('2', 'Test 2', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity1);
      useSceneStore.getState().addEntity(entity2);

      useSceneStore.getState().clearScene();

      const state = useSceneStore.getState();
      expect(state.entities).toEqual({});
      expect(state.rootIds).toEqual([]);
    });
  });

  describe('getEntity', () => {
    it('returns entity by id', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity);

      const result = useSceneStore.getState().getEntity('1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test');
    });

    it('returns undefined for non-existent entity', () => {
      const result = useSceneStore.getState().getEntity('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getRootEntities', () => {
    it('returns all root entities', () => {
      const entity1 = createEntity('1', 'Root 1', EntityType.Mesh);
      const entity2 = createEntity('2', 'Root 2', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity1);
      useSceneStore.getState().addEntity(entity2);

      const roots = useSceneStore.getState().getRootEntities();

      expect(roots).toHaveLength(2);
      expect(roots.map((e) => e.id)).toEqual(['1', '2']);
    });

    it('does not include child entities', () => {
      const parent = createEntity('parent', 'Parent', EntityType.Group);
      const child = createEntity('child', 'Child', EntityType.Mesh);
      useSceneStore.getState().addEntity(parent);
      useSceneStore.getState().addEntity(child, 'parent');

      const roots = useSceneStore.getState().getRootEntities();

      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe('parent');
    });
  });

  describe('getChildren', () => {
    it('returns children of an entity', () => {
      const parent = createEntity('parent', 'Parent', EntityType.Group);
      const child1 = createEntity('child1', 'Child 1', EntityType.Mesh);
      const child2 = createEntity('child2', 'Child 2', EntityType.Mesh);
      useSceneStore.getState().addEntity(parent);
      useSceneStore.getState().addEntity(child1, 'parent');
      useSceneStore.getState().addEntity(child2, 'parent');

      const children = useSceneStore.getState().getChildren('parent');

      expect(children).toHaveLength(2);
      expect(children.map((e) => e.id)).toEqual(['child1', 'child2']);
    });

    it('returns empty array for entity with no children', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity);

      const children = useSceneStore.getState().getChildren('1');

      expect(children).toEqual([]);
    });

    it('returns empty array for non-existent parent', () => {
      const children = useSceneStore.getState().getChildren('non-existent');

      expect(children).toEqual([]);
    });
  });

  describe('selectors', () => {
    it('selectEntityCount returns number of entities', () => {
      const entity1 = createEntity('1', 'Test 1', EntityType.Mesh);
      const entity2 = createEntity('2', 'Test 2', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity1);
      useSceneStore.getState().addEntity(entity2);

      const count = selectEntityCount(useSceneStore.getState());

      expect(count).toBe(2);
    });

    it('selectEntityExists returns true for existing entity', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh);
      useSceneStore.getState().addEntity(entity);

      const exists = selectEntityExists(useSceneStore.getState(), '1');

      expect(exists).toBe(true);
    });

    it('selectEntityExists returns false for non-existent entity', () => {
      const exists = selectEntityExists(useSceneStore.getState(), 'non-existent');

      expect(exists).toBe(false);
    });
  });
});
