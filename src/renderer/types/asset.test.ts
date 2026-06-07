/**
 * Asset Type Tests
 *
 * Tests for the asset library system, including bundled primitives.
 */

import { describe, it, expect } from 'vitest';
import {
  AssetCategory,
  AssetSource,
  BUNDLED_PRIMITIVES,
  BUNDLED_ASSETS,
  createPrimitiveAsset,
  createPrefabAsset,
  isDeletableAsset,
  type Asset,
} from './asset';
import { EntityType, createEntity } from './entity';

describe('Asset Types', () => {
  describe('AssetCategory enum', () => {
    it('should have all expected categories', () => {
      expect(AssetCategory.Primitives).toBe('primitives');
      expect(AssetCategory.Prefabs).toBe('prefabs');
      expect(AssetCategory.Furniture).toBe('furniture');
      expect(AssetCategory.Props).toBe('props');
      expect(AssetCategory.Nature).toBe('nature');
      expect(AssetCategory.Imported).toBe('imported');
    });
  });

  describe('AssetSource enum', () => {
    it('should have all expected sources', () => {
      expect(AssetSource.Bundled).toBe('bundled');
      expect(AssetSource.Cached).toBe('cached');
      expect(AssetSource.Imported).toBe('imported');
    });
  });
});

describe('createPrimitiveAsset', () => {
  it('should create a primitive asset with correct structure', () => {
    const asset = createPrimitiveAsset('test-id', 'Test Cube', 'cube', ['test-tag']);

    expect(asset.id).toBe('test-id');
    expect(asset.name).toBe('Test Cube');
    expect(asset.category).toBe(AssetCategory.Primitives);
    expect(asset.source).toBe(AssetSource.Bundled);
    expect(asset.primitiveType).toBe('cube');
    expect(asset.tags).toContain('primitive');
    expect(asset.tags).toContain('cube');
    expect(asset.tags).toContain('test-tag');
  });
});

describe('createPrefabAsset', () => {
  it('should create a prefab asset with entity data', () => {
    const entity = createEntity('test-entity', 'TestEntity', EntityType.CubeMesh);
    const asset = createPrefabAsset('prefab-1', 'Test Prefab', [entity], entity.id, ['custom']);

    expect(asset.id).toBe('prefab-1');
    expect(asset.name).toBe('Test Prefab');
    expect(asset.category).toBe(AssetCategory.Prefabs);
    expect(asset.source).toBe(AssetSource.Imported);
    expect(asset.prefabData).toBeDefined();
    expect(asset.prefabData?.entities).toHaveLength(1);
    expect(asset.prefabData?.rootId).toBe(entity.id);
    expect(asset.tags).toContain('prefab');
    expect(asset.tags).toContain('custom');
  });
});

describe('BUNDLED_PRIMITIVES', () => {
  it('should include all VEML primitive types', () => {
    const primitiveTypes = BUNDLED_PRIMITIVES.map((p) => p.primitiveType);

    // Original primitives
    expect(primitiveTypes).toContain('cube');
    expect(primitiveTypes).toContain('sphere');
    expect(primitiveTypes).toContain('cylinder');
    expect(primitiveTypes).toContain('plane');

    // New VEML primitives
    expect(primitiveTypes).toContain('capsule');
    expect(primitiveTypes).toContain('torus');
    expect(primitiveTypes).toContain('cone');
    expect(primitiveTypes).toContain('pyramid');
    expect(primitiveTypes).toContain('tetrahedron');
    expect(primitiveTypes).toContain('prism');
    expect(primitiveTypes).toContain('arch');
  });

  it('should have correct number of bundled primitives (11 total)', () => {
    // 4 original + 7 new VEML primitives = 11 total
    expect(BUNDLED_PRIMITIVES).toHaveLength(11);
  });

  it('should have all assets with proper structure', () => {
    for (const asset of BUNDLED_PRIMITIVES) {
      expect(asset.id).toBeDefined();
      expect(asset.name).toBeDefined();
      expect(asset.category).toBe(AssetCategory.Primitives);
      expect(asset.source).toBe(AssetSource.Bundled);
      expect(asset.primitiveType).toBeDefined();
      expect(asset.tags).toContain('primitive');
    }
  });

  describe('individual primitive assets', () => {
    it('should have Capsule primitive', () => {
      const capsule = BUNDLED_PRIMITIVES.find((p) => p.primitiveType === 'capsule');
      expect(capsule).toBeDefined();
      expect(capsule?.name).toBe('Capsule');
    });

    it('should have Torus primitive', () => {
      const torus = BUNDLED_PRIMITIVES.find((p) => p.primitiveType === 'torus');
      expect(torus).toBeDefined();
      expect(torus?.name).toBe('Torus');
    });

    it('should have Cone primitive', () => {
      const cone = BUNDLED_PRIMITIVES.find((p) => p.primitiveType === 'cone');
      expect(cone).toBeDefined();
      expect(cone?.name).toBe('Cone');
    });

    it('should have Pyramid primitive', () => {
      const pyramid = BUNDLED_PRIMITIVES.find((p) => p.primitiveType === 'pyramid');
      expect(pyramid).toBeDefined();
      expect(pyramid?.name).toBe('Pyramid');
    });

    it('should have Tetrahedron primitive', () => {
      const tetra = BUNDLED_PRIMITIVES.find((p) => p.primitiveType === 'tetrahedron');
      expect(tetra).toBeDefined();
      expect(tetra?.name).toBe('Tetrahedron');
    });

    it('should have Prism primitive', () => {
      const prism = BUNDLED_PRIMITIVES.find((p) => p.primitiveType === 'prism');
      expect(prism).toBeDefined();
      expect(prism?.name).toBe('Prism');
    });

    it('should have Arch primitive', () => {
      const arch = BUNDLED_PRIMITIVES.find((p) => p.primitiveType === 'arch');
      expect(arch).toBeDefined();
      expect(arch?.name).toBe('Arch');
    });
  });
});

describe('BUNDLED_ASSETS', () => {
  it('should include all bundled primitives', () => {
    expect(BUNDLED_ASSETS).toContain(BUNDLED_PRIMITIVES[0]);
    expect(BUNDLED_ASSETS.length).toBeGreaterThanOrEqual(BUNDLED_PRIMITIVES.length);
  });
});

describe('isDeletableAsset', () => {
  it('should return false for bundled assets (primitives)', () => {
    const primitiveAsset = createPrimitiveAsset('test-cube', 'Cube', 'cube');
    expect(isDeletableAsset(primitiveAsset)).toBe(false);
  });

  it('should return true for prefab assets', () => {
    const entity = createEntity('test-entity', 'TestEntity', EntityType.CubeMesh);
    const prefabAsset = createPrefabAsset('prefab-1', 'Test Prefab', [entity], entity.id);
    expect(isDeletableAsset(prefabAsset)).toBe(true);
  });

  it('should return true for imported assets', () => {
    const importedAsset: Asset = {
      id: 'imported-1',
      name: 'Imported Model',
      category: AssetCategory.Imported,
      source: AssetSource.Imported,
      tags: ['model'],
      filePath: '/path/to/model.glb',
    };
    expect(isDeletableAsset(importedAsset)).toBe(true);
  });

  it('should return true for cached assets', () => {
    const cachedAsset: Asset = {
      id: 'cached-1',
      name: 'Cached Model',
      category: AssetCategory.Props,
      source: AssetSource.Cached,
      tags: ['cached'],
      filePath: '/cache/model.glb',
    };
    expect(isDeletableAsset(cachedAsset)).toBe(true);
  });
});
