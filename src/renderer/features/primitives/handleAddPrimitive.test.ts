/**
 * Add Primitive Handler Tests
 *
 * Tests for adding primitive objects to the scene.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { EntityType } from '../../types/entity';
import { handleAddPrimitive } from './handleAddPrimitive';

// Mock crypto.randomUUID for consistent test IDs
vi.spyOn(crypto, 'randomUUID').mockImplementation(
  () => 'test-uuid' as `${string}-${string}-${string}-${string}-${string}`
);

describe('handleAddPrimitive', () => {
  beforeEach(() => {
    // Reset stores
    useSceneStore.setState({ entities: {}, rootIds: [] });
    useProjectStore.getState().newProject(); // This also sets isDirty to false
    vi.clearAllMocks();
  });

  afterEach(() => {
    useSceneStore.setState({ entities: {}, rootIds: [] });
    useProjectStore.getState().newProject();
  });

  describe('adding a cube', () => {
    it('should add cube entity to scene store', () => {
      handleAddPrimitive('cube');

      const state = useSceneStore.getState();
      expect(Object.keys(state.entities).length).toBe(1);
      expect(state.entities['test-uuid']).toBeDefined();
      expect(state.entities['test-uuid'].type).toBe(EntityType.CubeMesh);
    });

    it('should return the entity ID', () => {
      const id = handleAddPrimitive('cube');

      expect(id).toBe('test-uuid');
    });

    it('should mark project as dirty', () => {
      handleAddPrimitive('cube');

      expect(useProjectStore.getState().isDirty).toBe(true);
    });

    it('should set entity name to "Cube"', () => {
      handleAddPrimitive('cube');

      const entity = useSceneStore.getState().entities['test-uuid'];
      expect(entity.name).toBe('Cube');
    });
  });

  describe('adding a sphere', () => {
    it('should add sphere entity to scene store', () => {
      handleAddPrimitive('sphere');

      const entity = useSceneStore.getState().entities['test-uuid'];
      expect(entity.type).toBe(EntityType.SphereMesh);
      expect(entity.name).toBe('Sphere');
    });
  });

  describe('adding a plane', () => {
    it('should add plane entity to scene store', () => {
      handleAddPrimitive('plane');

      const entity = useSceneStore.getState().entities['test-uuid'];
      expect(entity.type).toBe(EntityType.PlaneMesh);
      expect(entity.name).toBe('Plane');
    });
  });

  describe('auto-increment naming', () => {
    it('should auto-increment names when duplicates exist', () => {
      // Reset mock to return unique IDs
      let uuidCounter = 0;
      vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
        return `uuid-${uuidCounter++}` as `${string}-${string}-${string}-${string}-${string}`;
      });

      handleAddPrimitive('cube');
      handleAddPrimitive('cube');
      handleAddPrimitive('cube');

      const entities = useSceneStore.getState().entities;
      const names = Object.values(entities).map((e) => e.name);

      expect(names).toContain('Cube');
      expect(names).toContain('Cube (1)');
      expect(names).toContain('Cube (2)');
    });
  });

  describe('entity placement', () => {
    it('should place entity at origin', () => {
      const id = handleAddPrimitive('cube');

      const entity = useSceneStore.getState().entities[id];
      expect(entity.transform.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should set default scale', () => {
      const id = handleAddPrimitive('cube');

      const entity = useSceneStore.getState().entities[id];
      expect(entity.transform.scale).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('should set identity rotation', () => {
      const id = handleAddPrimitive('cube');

      const entity = useSceneStore.getState().entities[id];
      expect(entity.transform.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    });
  });
});
