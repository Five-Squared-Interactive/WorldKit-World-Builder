/**
 * Primitive and Model Factory Functions
 *
 * Creates entity objects for primitive shapes (cube, sphere, plane, cylinder)
 * and imported GLTF models.
 * Uses UUID v4 for unique IDs and supports auto-increment naming.
 */

import { createEntity, EntityType, Entity } from '../../types/entity';
import type { PrimitiveType } from '../../../shared/types/ipc';

/**
 * Extract a base name from a file path
 * @param filePath - Full path to the file
 * @returns Base name without extension
 */
function getBaseName(filePath: string): string {
  // Get filename from path
  const parts = filePath.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1] || 'Model';

  // Remove extension
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
}

/**
 * Generate a unique name with auto-increment for duplicates
 * @param base - Base name (e.g., 'Cube')
 * @param existingNames - Array of existing entity names
 * @returns Unique name (e.g., 'Cube', 'Cube (1)', 'Cube (2)')
 */
export function generateUniqueName(base: string, existingNames: string[]): string {
  if (!existingNames.includes(base)) {
    return base;
  }

  let counter = 1;
  while (existingNames.includes(`${base} (${counter})`)) {
    counter++;
  }
  return `${base} (${counter})`;
}

/**
 * Create a cube entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with CubeMesh type
 */
export function createCubeEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Cube', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.CubeMesh);
}

/**
 * Create a sphere entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with SphereMesh type
 */
export function createSphereEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Sphere', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.SphereMesh);
}

/**
 * Create a plane entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with PlaneMesh type
 */
export function createPlaneEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Plane', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.PlaneMesh);
}

/**
 * Create a cylinder entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with CylinderMesh type
 */
export function createCylinderEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Cylinder', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.CylinderMesh);
}

/**
 * Create a capsule entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with CapsuleMesh type
 */
export function createCapsuleEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Capsule', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.CapsuleMesh);
}

/**
 * Create a torus entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with TorusMesh type
 */
export function createTorusEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Torus', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.TorusMesh);
}

/**
 * Create a cone entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with ConeMesh type
 */
export function createConeEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Cone', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.ConeMesh);
}

/**
 * Create a pyramid entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with PyramidMesh type
 */
export function createPyramidEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Pyramid', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.PyramidMesh);
}

/**
 * Create a tetrahedron entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with TetrahedronMesh type
 */
export function createTetrahedronEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Tetrahedron', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.TetrahedronMesh);
}

/**
 * Create a prism entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with PrismMesh type
 */
export function createPrismEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Prism', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.PrismMesh);
}

/**
 * Create an arch entity
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity with ArchMesh type
 */
export function createArchEntity(existingNames: string[] = []): Entity {
  const name = generateUniqueName('Arch', existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.ArchMesh);
}

/**
 * Create a primitive entity based on type
 * @param type - The type of primitive to create
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Entity for the specified primitive type
 */
export function createPrimitiveEntity(
  type: PrimitiveType,
  existingNames: string[] = []
): Entity {
  switch (type) {
    case 'cube':
      return createCubeEntity(existingNames);
    case 'sphere':
      return createSphereEntity(existingNames);
    case 'plane':
      return createPlaneEntity(existingNames);
    case 'cylinder':
      return createCylinderEntity(existingNames);
    case 'capsule':
      return createCapsuleEntity(existingNames);
    case 'torus':
      return createTorusEntity(existingNames);
    case 'cone':
      return createConeEntity(existingNames);
    case 'pyramid':
      return createPyramidEntity(existingNames);
    case 'tetrahedron':
      return createTetrahedronEntity(existingNames);
    case 'prism':
      return createPrismEntity(existingNames);
    case 'arch':
      return createArchEntity(existingNames);
    default: {
      // Fallback for unknown types
      throw new Error(`Unknown primitive type: ${type}`);
    }
  }
}

/**
 * Create a GLTF model entity
 * @param filePath - Path to the GLB/GLTF file
 * @param existingNames - Array of existing entity names for auto-increment
 * @param modelData - Optional base64-encoded model data
 * @returns Entity with GltfMesh type
 */
export function createGltfEntity(
  filePath: string,
  existingNames: string[] = [],
  modelData?: string
): Entity {
  const baseName = getBaseName(filePath);
  const name = generateUniqueName(baseName, existingNames);
  return createEntity(crypto.randomUUID(), name, EntityType.GltfMesh, {
    modelPath: filePath,
    modelData,
  });
}

/**
 * Instantiate a prefab - creates new entities with regenerated IDs and remapped relationships
 * @param prefabEntities - The entities from the prefab data
 * @param prefabRootId - The root entity ID from the prefab
 * @param existingNames - Array of existing entity names for auto-increment
 * @returns Array of new entities ready to be added to the scene
 */
export function instantiatePrefab(
  prefabEntities: Entity[],
  prefabRootId: string,
  existingNames: string[] = []
): Entity[] {
  // Create a mapping from old IDs to new IDs
  const idMap = new Map<string, string>();
  for (const entity of prefabEntities) {
    idMap.set(entity.id, crypto.randomUUID());
  }

  // Clone entities with new IDs and remapped relationships
  const newEntities: Entity[] = [];
  const usedNames = [...existingNames];

  for (const entity of prefabEntities) {
    const newId = idMap.get(entity.id)!;
    const isRoot = entity.id === prefabRootId;

    // Generate unique name
    const newName = generateUniqueName(entity.name, usedNames);
    usedNames.push(newName);

    // Deep clone the entity
    const newEntity: Entity = {
      ...entity,
      id: newId,
      name: newName,
      // Root entity has no parent; children reference new parent IDs
      parentId: isRoot ? null : (entity.parentId ? idMap.get(entity.parentId) ?? null : null),
      // Remap child IDs
      childIds: entity.childIds.map((childId) => idMap.get(childId) ?? childId),
      // Deep clone transform
      transform: {
        position: { ...entity.transform.position },
        rotation: { ...entity.transform.rotation },
        scale: { ...entity.transform.scale },
      },
    };

    newEntities.push(newEntity);
  }

  return newEntities;
}
