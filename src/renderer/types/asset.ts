/**
 * Asset Type Definitions
 *
 * Types for the asset library system.
 */

import type { Entity } from './entity';

/**
 * Asset categories for organization
 */
export enum AssetCategory {
  Primitives = 'primitives',
  Prefabs = 'prefabs',
  Furniture = 'furniture',
  Props = 'props',
  Nature = 'nature',
  Imported = 'imported',
}

/**
 * Asset source types
 */
export enum AssetSource {
  Bundled = 'bundled',
  Cached = 'cached',
  Imported = 'imported',
}

/**
 * Asset definition
 */
export interface Asset {
  /** Unique asset identifier */
  id: string;

  /** Display name */
  name: string;

  /** Asset category */
  category: AssetCategory;

  /** Asset source */
  source: AssetSource;

  /** Searchable tags */
  tags: string[];

  /** Thumbnail URL or data URI (optional for primitives) */
  thumbnail?: string;

  /** Path to GLB file (for imported/cached assets) */
  filePath?: string;

  /** Primitive type (for primitive assets) */
  primitiveType?: 'cube' | 'sphere' | 'cylinder' | 'plane' | 'capsule' | 'torus' | 'cone' | 'pyramid' | 'tetrahedron' | 'prism' | 'arch';

  /** Prefab data (for prefab assets) - serialized entities */
  prefabData?: {
    /** Root entity and all descendants */
    entities: Entity[];
    /** ID of the root entity */
    rootId: string;
  };
}

/** All supported primitive types */
export type PrimitiveAssetType = 'cube' | 'sphere' | 'cylinder' | 'plane' | 'capsule' | 'torus' | 'cone' | 'pyramid' | 'tetrahedron' | 'prism' | 'arch';

/**
 * Create a primitive asset definition
 */
export function createPrimitiveAsset(
  id: string,
  name: string,
  primitiveType: PrimitiveAssetType,
  tags: string[] = []
): Asset {
  return {
    id,
    name,
    category: AssetCategory.Primitives,
    source: AssetSource.Bundled,
    tags: ['primitive', primitiveType, ...tags],
    primitiveType,
  };
}

/**
 * Bundled primitive assets - all VEML primitive mesh types
 */
export const BUNDLED_PRIMITIVES: Asset[] = [
  // Basic primitives
  createPrimitiveAsset('primitive-cube', 'Cube', 'cube', ['box', 'basic']),
  createPrimitiveAsset('primitive-sphere', 'Sphere', 'sphere', ['ball', 'round', 'basic']),
  createPrimitiveAsset('primitive-cylinder', 'Cylinder', 'cylinder', ['tube', 'pillar', 'basic']),
  createPrimitiveAsset('primitive-plane', 'Plane', 'plane', ['flat', 'ground', 'floor', 'basic']),
  // Additional VEML primitives
  createPrimitiveAsset('primitive-capsule', 'Capsule', 'capsule', ['pill', 'rounded', 'basic']),
  createPrimitiveAsset('primitive-torus', 'Torus', 'torus', ['donut', 'ring', 'basic']),
  createPrimitiveAsset('primitive-cone', 'Cone', 'cone', ['pointed', 'basic']),
  createPrimitiveAsset('primitive-pyramid', 'Pyramid', 'pyramid', ['pointed', 'egyptian', 'basic']),
  createPrimitiveAsset('primitive-tetrahedron', 'Tetrahedron', 'tetrahedron', ['triangle', 'basic']),
  createPrimitiveAsset('primitive-prism', 'Prism', 'prism', ['triangle', 'basic']),
  createPrimitiveAsset('primitive-arch', 'Arch', 'arch', ['doorway', 'architectural', 'basic']),
];

/**
 * Create a prefab asset from an entity hierarchy
 */
export function createPrefabAsset(
  id: string,
  name: string,
  entities: Entity[],
  rootId: string,
  tags: string[] = []
): Asset {
  return {
    id,
    name,
    category: AssetCategory.Prefabs,
    source: AssetSource.Imported,
    tags: ['prefab', ...tags],
    prefabData: {
      entities,
      rootId,
    },
  };
}

/**
 * All bundled assets
 */
export const BUNDLED_ASSETS: Asset[] = [...BUNDLED_PRIMITIVES];

/**
 * Check if an asset can be deleted by the user.
 * Bundled assets (primitives) cannot be deleted.
 */
export function isDeletableAsset(asset: Asset): boolean {
  return asset.source !== AssetSource.Bundled;
}
