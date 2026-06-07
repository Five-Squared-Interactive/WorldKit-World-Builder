/**
 * Entity Type Definitions
 *
 * Core types for the WorldKit scene graph.
 * Entities are the building blocks of a VEML world.
 */

/**
 * Entity types matching VEML schema
 */
export enum EntityType {
  Mesh = 'mesh',
  CubeMesh = 'cubemesh',
  SphereMesh = 'spheremesh',
  PlaneMesh = 'planemesh',
  CylinderMesh = 'cylindermesh',
  CapsuleMesh = 'capsulemesh',
  TorusMesh = 'torusmesh',
  ConeMesh = 'conemesh',
  PyramidMesh = 'rectangularpyramidmesh',
  TetrahedronMesh = 'tetrahedronmesh',
  PrismMesh = 'prismmesh',
  ArchMesh = 'archmesh',
  GltfMesh = 'gltfmesh',
  Light = 'light',
  Group = 'group',
}

/**
 * 3D Vector for position, scale
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion for rotation (VEML uses quaternions, not euler angles)
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Transform component for entity positioning
 */
export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

/**
 * Default transform values
 */
export const DEFAULT_TRANSFORM: Transform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 }, // Identity quaternion
  scale: { x: 1, y: 1, z: 1 },
};

/**
 * Default color for primitive meshes (neutral gray)
 */
export const DEFAULT_PRIMITIVE_COLOR = '#808080';

/**
 * Base entity interface for all scene objects
 */
export interface Entity {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Display name for the entity */
  name: string;

  /** Entity type from VEML schema */
  type: EntityType;

  /** Transform (position, rotation, scale) */
  transform: Transform;

  /** Parent entity ID (null for root entities) */
  parentId: string | null;

  /** Child entity IDs */
  childIds: string[];

  /** Whether the entity is visible in the viewport */
  visible: boolean;

  /** Whether the entity is locked (cannot be selected/modified) */
  locked: boolean;

  /** Path to external model file (for GltfMesh entities) */
  modelPath?: string;

  /** Base64-encoded model data (for runtime loading without file access) */
  modelData?: string;

  /** Hex color for primitive meshes (e.g., "#ff0000"). Only applicable to mesh types. */
  color?: string;
}

/**
 * Create a deep copy of the default transform
 * Prevents mutation of DEFAULT_TRANSFORM when modifying entity transforms
 */
function createDefaultTransform(): Transform {
  return {
    position: { ...DEFAULT_TRANSFORM.position },
    rotation: { ...DEFAULT_TRANSFORM.rotation },
    scale: { ...DEFAULT_TRANSFORM.scale },
  };
}

/**
 * Create a new entity with default values
 */
export function createEntity(
  id: string,
  name: string,
  type: EntityType,
  overrides?: Partial<Entity>
): Entity {
  return {
    id,
    name,
    type,
    transform: createDefaultTransform(),
    parentId: null,
    childIds: [],
    visible: true,
    locked: false,
    ...overrides,
  };
}
