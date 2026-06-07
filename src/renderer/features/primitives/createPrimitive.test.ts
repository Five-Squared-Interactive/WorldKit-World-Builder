/**
 * Primitive Factory Tests
 *
 * Tests for entity creation from primitive types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityType } from '../../types/entity';
import {
  createCubeEntity,
  createSphereEntity,
  createPlaneEntity,
  createCylinderEntity,
  createCapsuleEntity,
  createTorusEntity,
  createConeEntity,
  createPyramidEntity,
  createTetrahedronEntity,
  createPrismEntity,
  createArchEntity,
  createPrimitiveEntity,
  createGltfEntity,
  generateUniqueName,
  instantiatePrefab,
} from './createPrimitive';
import type { Entity } from '../../types/entity';

// Mock crypto.randomUUID for consistent test IDs
const mockUUIDs = [
  'test-uuid-1',
  'test-uuid-2',
  'test-uuid-3',
  'test-uuid-4',
  'test-uuid-5',
];
let uuidIndex = 0;

beforeEach(() => {
  uuidIndex = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    const uuid = mockUUIDs[uuidIndex % mockUUIDs.length];
    uuidIndex++;
    return uuid as `${string}-${string}-${string}-${string}-${string}`;
  });
});

describe('generateUniqueName', () => {
  it('should return base name when no duplicates exist', () => {
    expect(generateUniqueName('Cube', [])).toBe('Cube');
  });

  it('should return base name when existing names do not include base', () => {
    expect(generateUniqueName('Cube', ['Sphere', 'Plane'])).toBe('Cube');
  });

  it('should return numbered name when base exists', () => {
    expect(generateUniqueName('Cube', ['Cube'])).toBe('Cube (1)');
  });

  it('should increment number when numbered names exist', () => {
    expect(generateUniqueName('Cube', ['Cube', 'Cube (1)'])).toBe('Cube (2)');
  });

  it('should find first available number in sequence', () => {
    expect(generateUniqueName('Cube', ['Cube', 'Cube (1)', 'Cube (2)', 'Cube (3)'])).toBe(
      'Cube (4)'
    );
  });

  it('should handle gaps in numbering', () => {
    // If 'Cube (2)' exists but 'Cube (1)' doesn't, should still start from 1
    expect(generateUniqueName('Cube', ['Cube', 'Cube (2)'])).toBe('Cube (1)');
  });
});

describe('createCubeEntity', () => {
  it('should create entity with CubeMesh type', () => {
    const entity = createCubeEntity();
    expect(entity.type).toBe(EntityType.CubeMesh);
  });

  it('should generate unique ID using crypto.randomUUID', () => {
    const entity = createCubeEntity();
    expect(entity.id).toBe('test-uuid-1');
  });

  it('should create entities with different IDs', () => {
    const e1 = createCubeEntity();
    const e2 = createCubeEntity();
    expect(e1.id).not.toBe(e2.id);
  });

  it('should set name to "Cube" when no existing names', () => {
    const entity = createCubeEntity();
    expect(entity.name).toBe('Cube');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createCubeEntity(['Cube']);
    expect(entity.name).toBe('Cube (1)');
  });

  it('should have default transform at origin', () => {
    const entity = createCubeEntity();
    expect(entity.transform.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(entity.transform.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    expect(entity.transform.scale).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('should have no parent and no children', () => {
    const entity = createCubeEntity();
    expect(entity.parentId).toBeNull();
    expect(entity.childIds).toEqual([]);
  });

  it('should be visible and not locked', () => {
    const entity = createCubeEntity();
    expect(entity.visible).toBe(true);
    expect(entity.locked).toBe(false);
  });
});

describe('createSphereEntity', () => {
  it('should create entity with SphereMesh type', () => {
    const entity = createSphereEntity();
    expect(entity.type).toBe(EntityType.SphereMesh);
  });

  it('should set name to "Sphere"', () => {
    const entity = createSphereEntity();
    expect(entity.name).toBe('Sphere');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createSphereEntity(['Sphere', 'Sphere (1)']);
    expect(entity.name).toBe('Sphere (2)');
  });
});

describe('createPlaneEntity', () => {
  it('should create entity with PlaneMesh type', () => {
    const entity = createPlaneEntity();
    expect(entity.type).toBe(EntityType.PlaneMesh);
  });

  it('should set name to "Plane"', () => {
    const entity = createPlaneEntity();
    expect(entity.name).toBe('Plane');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createPlaneEntity(['Plane']);
    expect(entity.name).toBe('Plane (1)');
  });
});

describe('createPrimitiveEntity', () => {
  it('should create cube entity for "cube" type', () => {
    const entity = createPrimitiveEntity('cube');
    expect(entity.type).toBe(EntityType.CubeMesh);
    expect(entity.name).toBe('Cube');
  });

  it('should create sphere entity for "sphere" type', () => {
    const entity = createPrimitiveEntity('sphere');
    expect(entity.type).toBe(EntityType.SphereMesh);
    expect(entity.name).toBe('Sphere');
  });

  it('should create plane entity for "plane" type', () => {
    const entity = createPrimitiveEntity('plane');
    expect(entity.type).toBe(EntityType.PlaneMesh);
    expect(entity.name).toBe('Plane');
  });

  it('should pass existing names for auto-increment', () => {
    const entity = createPrimitiveEntity('cube', ['Cube', 'Cube (1)']);
    expect(entity.name).toBe('Cube (2)');
  });

  it('should create cylinder entity for "cylinder" type', () => {
    const entity = createPrimitiveEntity('cylinder');
    expect(entity.type).toBe(EntityType.CylinderMesh);
    expect(entity.name).toBe('Cylinder');
  });

  it('should create capsule entity for "capsule" type', () => {
    const entity = createPrimitiveEntity('capsule');
    expect(entity.type).toBe(EntityType.CapsuleMesh);
    expect(entity.name).toBe('Capsule');
  });

  it('should create torus entity for "torus" type', () => {
    const entity = createPrimitiveEntity('torus');
    expect(entity.type).toBe(EntityType.TorusMesh);
    expect(entity.name).toBe('Torus');
  });

  it('should create cone entity for "cone" type', () => {
    const entity = createPrimitiveEntity('cone');
    expect(entity.type).toBe(EntityType.ConeMesh);
    expect(entity.name).toBe('Cone');
  });

  it('should create pyramid entity for "pyramid" type', () => {
    const entity = createPrimitiveEntity('pyramid');
    expect(entity.type).toBe(EntityType.PyramidMesh);
    expect(entity.name).toBe('Pyramid');
  });

  it('should create tetrahedron entity for "tetrahedron" type', () => {
    const entity = createPrimitiveEntity('tetrahedron');
    expect(entity.type).toBe(EntityType.TetrahedronMesh);
    expect(entity.name).toBe('Tetrahedron');
  });

  it('should create prism entity for "prism" type', () => {
    const entity = createPrimitiveEntity('prism');
    expect(entity.type).toBe(EntityType.PrismMesh);
    expect(entity.name).toBe('Prism');
  });

  it('should create arch entity for "arch" type', () => {
    const entity = createPrimitiveEntity('arch');
    expect(entity.type).toBe(EntityType.ArchMesh);
    expect(entity.name).toBe('Arch');
  });

  it('should throw error for unknown type', () => {
    expect(() => createPrimitiveEntity('unknown' as unknown as 'cube')).toThrow(
      'Unknown primitive type'
    );
  });
});

describe('createCylinderEntity', () => {
  it('should create entity with CylinderMesh type', () => {
    const entity = createCylinderEntity();
    expect(entity.type).toBe(EntityType.CylinderMesh);
  });

  it('should set name to "Cylinder"', () => {
    const entity = createCylinderEntity();
    expect(entity.name).toBe('Cylinder');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createCylinderEntity(['Cylinder']);
    expect(entity.name).toBe('Cylinder (1)');
  });
});

describe('createCapsuleEntity (VEML primitive)', () => {
  it('should create entity with CapsuleMesh type', () => {
    const entity = createCapsuleEntity();
    expect(entity.type).toBe(EntityType.CapsuleMesh);
  });

  it('should set name to "Capsule"', () => {
    const entity = createCapsuleEntity();
    expect(entity.name).toBe('Capsule');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createCapsuleEntity(['Capsule']);
    expect(entity.name).toBe('Capsule (1)');
  });
});

describe('createTorusEntity (VEML primitive)', () => {
  it('should create entity with TorusMesh type', () => {
    const entity = createTorusEntity();
    expect(entity.type).toBe(EntityType.TorusMesh);
  });

  it('should set name to "Torus"', () => {
    const entity = createTorusEntity();
    expect(entity.name).toBe('Torus');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createTorusEntity(['Torus']);
    expect(entity.name).toBe('Torus (1)');
  });
});

describe('createConeEntity (VEML primitive)', () => {
  it('should create entity with ConeMesh type', () => {
    const entity = createConeEntity();
    expect(entity.type).toBe(EntityType.ConeMesh);
  });

  it('should set name to "Cone"', () => {
    const entity = createConeEntity();
    expect(entity.name).toBe('Cone');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createConeEntity(['Cone']);
    expect(entity.name).toBe('Cone (1)');
  });
});

describe('createPyramidEntity (VEML rectangularpyramidmesh)', () => {
  it('should create entity with PyramidMesh type', () => {
    const entity = createPyramidEntity();
    expect(entity.type).toBe(EntityType.PyramidMesh);
  });

  it('should set name to "Pyramid"', () => {
    const entity = createPyramidEntity();
    expect(entity.name).toBe('Pyramid');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createPyramidEntity(['Pyramid']);
    expect(entity.name).toBe('Pyramid (1)');
  });
});

describe('createTetrahedronEntity (VEML primitive)', () => {
  it('should create entity with TetrahedronMesh type', () => {
    const entity = createTetrahedronEntity();
    expect(entity.type).toBe(EntityType.TetrahedronMesh);
  });

  it('should set name to "Tetrahedron"', () => {
    const entity = createTetrahedronEntity();
    expect(entity.name).toBe('Tetrahedron');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createTetrahedronEntity(['Tetrahedron']);
    expect(entity.name).toBe('Tetrahedron (1)');
  });
});

describe('createPrismEntity (VEML primitive)', () => {
  it('should create entity with PrismMesh type', () => {
    const entity = createPrismEntity();
    expect(entity.type).toBe(EntityType.PrismMesh);
  });

  it('should set name to "Prism"', () => {
    const entity = createPrismEntity();
    expect(entity.name).toBe('Prism');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createPrismEntity(['Prism']);
    expect(entity.name).toBe('Prism (1)');
  });
});

describe('createArchEntity (VEML primitive)', () => {
  it('should create entity with ArchMesh type', () => {
    const entity = createArchEntity();
    expect(entity.type).toBe(EntityType.ArchMesh);
  });

  it('should set name to "Arch"', () => {
    const entity = createArchEntity();
    expect(entity.name).toBe('Arch');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createArchEntity(['Arch']);
    expect(entity.name).toBe('Arch (1)');
  });
});

describe('createGltfEntity', () => {
  it('should create entity with GltfMesh type', () => {
    const entity = createGltfEntity('C:/path/to/model.glb');
    expect(entity.type).toBe(EntityType.GltfMesh);
  });

  it('should extract name from file path', () => {
    const entity = createGltfEntity('C:/path/to/MyModel.glb');
    expect(entity.name).toBe('MyModel');
  });

  it('should handle paths with forward slashes', () => {
    const entity = createGltfEntity('/home/user/models/test-model.gltf');
    expect(entity.name).toBe('test-model');
  });

  it('should handle paths with backslashes', () => {
    const entity = createGltfEntity('C:\\Users\\test\\Downloads\\robot.glb');
    expect(entity.name).toBe('robot');
  });

  it('should store model path', () => {
    const entity = createGltfEntity('C:/models/test.glb');
    expect(entity.modelPath).toBe('C:/models/test.glb');
  });

  it('should store model data when provided', () => {
    const entity = createGltfEntity('test.glb', [], 'base64data');
    expect(entity.modelData).toBe('base64data');
  });

  it('should auto-increment name when duplicates exist', () => {
    const entity = createGltfEntity('test.glb', ['test']);
    expect(entity.name).toBe('test (1)');
  });

  it('should have default transform', () => {
    const entity = createGltfEntity('model.glb');
    expect(entity.transform.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(entity.transform.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    expect(entity.transform.scale).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('should handle files with multiple dots in name', () => {
    const entity = createGltfEntity('my.model.v2.glb');
    expect(entity.name).toBe('my.model.v2');
  });
});

describe('instantiatePrefab', () => {
  // Create sample prefab entities for testing
  function createPrefabEntities(): { entities: Entity[]; rootId: string } {
    const parentEntity: Entity = {
      id: 'parent-id-123',
      name: 'Parent',
      type: EntityType.Group,
      transform: {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      parentId: null,
      childIds: ['child-id-456'],
      visible: true,
      locked: false,
    };

    const childEntity: Entity = {
      id: 'child-id-456',
      name: 'Child',
      type: EntityType.CubeMesh,
      transform: {
        position: { x: 0, y: 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 2, y: 2, z: 2 },
      },
      parentId: 'parent-id-123',
      childIds: [],
      visible: true,
      locked: false,
      color: '#ff0000',
    };

    return {
      entities: [parentEntity, childEntity],
      rootId: 'parent-id-123',
    };
  }

  it('should generate new IDs for all entities', () => {
    const { entities, rootId } = createPrefabEntities();
    const result = instantiatePrefab(entities, rootId);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('test-uuid-1');
    expect(result[1].id).toBe('test-uuid-2');
    expect(result[0].id).not.toBe(entities[0].id);
    expect(result[1].id).not.toBe(entities[1].id);
  });

  it('should remap parent-child relationships', () => {
    const { entities, rootId } = createPrefabEntities();
    const result = instantiatePrefab(entities, rootId);

    // Root entity should have no parent
    expect(result[0].parentId).toBeNull();
    // Root's childIds should reference new child ID
    expect(result[0].childIds).toEqual(['test-uuid-2']);
    // Child should reference new parent ID
    expect(result[1].parentId).toBe('test-uuid-1');
  });

  it('should preserve transform values', () => {
    const { entities, rootId } = createPrefabEntities();
    const result = instantiatePrefab(entities, rootId);

    expect(result[0].transform.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(result[1].transform.scale).toEqual({ x: 2, y: 2, z: 2 });
  });

  it('should deep clone transforms', () => {
    const { entities, rootId } = createPrefabEntities();
    const result = instantiatePrefab(entities, rootId);

    // Modify result transform
    result[0].transform.position.x = 999;

    // Original should be unchanged
    expect(entities[0].transform.position.x).toBe(1);
  });

  it('should generate unique names', () => {
    const { entities, rootId } = createPrefabEntities();
    const existingNames = ['Parent', 'Child'];
    const result = instantiatePrefab(entities, rootId, existingNames);

    expect(result[0].name).toBe('Parent (1)');
    expect(result[1].name).toBe('Child (1)');
  });

  it('should preserve entity properties like color', () => {
    const { entities, rootId } = createPrefabEntities();
    const result = instantiatePrefab(entities, rootId);

    expect(result[1].color).toBe('#ff0000');
  });

  it('should handle single entity prefabs', () => {
    const singleEntity: Entity = {
      id: 'single-123',
      name: 'SingleCube',
      type: EntityType.CubeMesh,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      parentId: null,
      childIds: [],
      visible: true,
      locked: false,
    };

    const result = instantiatePrefab([singleEntity], 'single-123');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test-uuid-1');
    expect(result[0].parentId).toBeNull();
    expect(result[0].childIds).toEqual([]);
  });
});
