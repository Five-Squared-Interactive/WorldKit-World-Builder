import { describe, it, expect } from 'vitest';
import {
  EntityType,
  DEFAULT_TRANSFORM,
  createEntity,
  type Entity,
  type Transform,
  type Vector3,
  type Quaternion,
} from './entity';

describe('Entity Types', () => {
  describe('EntityType enum', () => {
    it('has all VEML entity types', () => {
      expect(EntityType.Mesh).toBe('mesh');
      expect(EntityType.CubeMesh).toBe('cubemesh');
      expect(EntityType.SphereMesh).toBe('spheremesh');
      expect(EntityType.PlaneMesh).toBe('planemesh');
      expect(EntityType.CylinderMesh).toBe('cylindermesh');
      expect(EntityType.Light).toBe('light');
      expect(EntityType.Group).toBe('group');
    });

    it('has all VEML primitive mesh types from schema', () => {
      // Additional primitive types from VEML 3.0 schema
      expect(EntityType.CapsuleMesh).toBe('capsulemesh');
      expect(EntityType.TorusMesh).toBe('torusmesh');
      expect(EntityType.ConeMesh).toBe('conemesh');
      expect(EntityType.PyramidMesh).toBe('rectangularpyramidmesh');
      expect(EntityType.TetrahedronMesh).toBe('tetrahedronmesh');
      expect(EntityType.PrismMesh).toBe('prismmesh');
      expect(EntityType.ArchMesh).toBe('archmesh');
    });
  });

  describe('DEFAULT_TRANSFORM', () => {
    it('has zero position', () => {
      expect(DEFAULT_TRANSFORM.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('has identity quaternion rotation', () => {
      expect(DEFAULT_TRANSFORM.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    });

    it('has unit scale', () => {
      expect(DEFAULT_TRANSFORM.scale).toEqual({ x: 1, y: 1, z: 1 });
    });
  });

  describe('createEntity', () => {
    it('creates entity with required fields', () => {
      const entity = createEntity('test-id', 'Test Entity', EntityType.Mesh);

      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('Test Entity');
      expect(entity.type).toBe(EntityType.Mesh);
    });

    it('creates entity with default transform', () => {
      const entity = createEntity('test-id', 'Test Entity', EntityType.CubeMesh);

      expect(entity.transform.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(entity.transform.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(entity.transform.scale).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('creates entity with default parent and children', () => {
      const entity = createEntity('test-id', 'Test Entity', EntityType.Group);

      expect(entity.parentId).toBeNull();
      expect(entity.childIds).toEqual([]);
    });

    it('creates entity with default visibility and lock state', () => {
      const entity = createEntity('test-id', 'Test Entity', EntityType.Light);

      expect(entity.visible).toBe(true);
      expect(entity.locked).toBe(false);
    });

    it('allows overriding default values', () => {
      const customTransform: Transform = {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0.5, y: 0.5, z: 0.5, w: 0.5 },
        scale: { x: 2, y: 2, z: 2 },
      };

      const entity = createEntity('test-id', 'Test Entity', EntityType.Mesh, {
        transform: customTransform,
        parentId: 'parent-id',
        visible: false,
        locked: true,
      });

      expect(entity.transform).toEqual(customTransform);
      expect(entity.parentId).toBe('parent-id');
      expect(entity.visible).toBe(false);
      expect(entity.locked).toBe(true);
    });

    it('allows overriding childIds', () => {
      const entity = createEntity('parent-id', 'Parent', EntityType.Group, {
        childIds: ['child-1', 'child-2'],
      });

      expect(entity.childIds).toEqual(['child-1', 'child-2']);
    });
  });

  describe('Type safety', () => {
    it('Vector3 has x, y, z properties', () => {
      const vec: Vector3 = { x: 1, y: 2, z: 3 };
      expect(vec.x).toBe(1);
      expect(vec.y).toBe(2);
      expect(vec.z).toBe(3);
    });

    it('Quaternion has x, y, z, w properties', () => {
      const quat: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
      expect(quat.x).toBe(0);
      expect(quat.y).toBe(0);
      expect(quat.z).toBe(0);
      expect(quat.w).toBe(1);
    });
  });

  describe('Transform isolation', () => {
    it('createEntity returns independent transform objects', () => {
      const entity1 = createEntity('1', 'Entity 1', EntityType.Mesh);
      const entity2 = createEntity('2', 'Entity 2', EntityType.Mesh);

      // Modify entity1's transform
      entity1.transform.position.x = 100;
      entity1.transform.rotation.w = 0.5;
      entity1.transform.scale.y = 2;

      // entity2 should not be affected
      expect(entity2.transform.position.x).toBe(0);
      expect(entity2.transform.rotation.w).toBe(1);
      expect(entity2.transform.scale.y).toBe(1);
    });

    it('modifying entity transform does not affect DEFAULT_TRANSFORM', () => {
      const entity = createEntity('1', 'Test', EntityType.Mesh);

      // Modify the entity's transform
      entity.transform.position.x = 999;

      // Create another entity - should still have default values
      const entity2 = createEntity('2', 'Test 2', EntityType.Mesh);
      expect(entity2.transform.position.x).toBe(0);
    });
  });
});
