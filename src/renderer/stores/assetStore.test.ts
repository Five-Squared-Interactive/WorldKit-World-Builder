/**
 * Asset Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useAssetStore,
  selectAssetById,
  selectAssetsByCategory,
  selectAssetCount,
} from './assetStore';
import { AssetCategory, AssetSource, BUNDLED_ASSETS } from '../types/asset';
import type { Asset } from '../types/asset';

describe('assetStore', () => {
  beforeEach(() => {
    useAssetStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have bundled assets loaded', () => {
      const state = useAssetStore.getState();
      expect(state.assets.length).toBeGreaterThan(0);
      expect(state.assets).toEqual(BUNDLED_ASSETS);
    });

    it('should have no category filter by default', () => {
      const state = useAssetStore.getState();
      expect(state.selectedCategory).toBeNull();
    });

    it('should have empty search query by default', () => {
      const state = useAssetStore.getState();
      expect(state.searchQuery).toBe('');
    });

    it('should not be loading by default', () => {
      const state = useAssetStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setSelectedCategory', () => {
    it('should set selected category', () => {
      useAssetStore.getState().setSelectedCategory(AssetCategory.Primitives);
      expect(useAssetStore.getState().selectedCategory).toBe(AssetCategory.Primitives);
    });

    it('should clear category filter with null', () => {
      useAssetStore.getState().setSelectedCategory(AssetCategory.Primitives);
      useAssetStore.getState().setSelectedCategory(null);
      expect(useAssetStore.getState().selectedCategory).toBeNull();
    });
  });

  describe('setSearchQuery', () => {
    it('should set search query', () => {
      useAssetStore.getState().setSearchQuery('cube');
      expect(useAssetStore.getState().searchQuery).toBe('cube');
    });

    it('should allow empty search query', () => {
      useAssetStore.getState().setSearchQuery('cube');
      useAssetStore.getState().setSearchQuery('');
      expect(useAssetStore.getState().searchQuery).toBe('');
    });
  });

  describe('addAsset', () => {
    it('should add a new asset', () => {
      const initialCount = useAssetStore.getState().assets.length;

      const newAsset: Asset = {
        id: 'new-asset',
        name: 'New Asset',
        category: AssetCategory.Imported,
        source: AssetSource.Imported,
        tags: ['test'],
      };

      useAssetStore.getState().addAsset(newAsset);

      expect(useAssetStore.getState().assets.length).toBe(initialCount + 1);
      expect(useAssetStore.getState().assets.find((a) => a.id === 'new-asset')).toBeDefined();
    });
  });

  describe('removeAsset', () => {
    it('should remove an asset by id', () => {
      const newAsset: Asset = {
        id: 'to-remove',
        name: 'To Remove',
        category: AssetCategory.Imported,
        source: AssetSource.Imported,
        tags: [],
      };

      useAssetStore.getState().addAsset(newAsset);
      expect(useAssetStore.getState().assets.find((a) => a.id === 'to-remove')).toBeDefined();

      useAssetStore.getState().removeAsset('to-remove');
      expect(useAssetStore.getState().assets.find((a) => a.id === 'to-remove')).toBeUndefined();
    });

    it('should not throw when removing non-existent asset', () => {
      expect(() => useAssetStore.getState().removeAsset('non-existent')).not.toThrow();
    });
  });

  describe('getFilteredAssets', () => {
    it('should return all assets when no filters', () => {
      const filtered = useAssetStore.getState().getFilteredAssets();
      expect(filtered).toEqual(BUNDLED_ASSETS);
    });

    it('should filter by category', () => {
      useAssetStore.getState().setSelectedCategory(AssetCategory.Primitives);
      const filtered = useAssetStore.getState().getFilteredAssets();

      expect(filtered.every((a) => a.category === AssetCategory.Primitives)).toBe(true);
    });

    it('should filter by search query matching name', () => {
      useAssetStore.getState().setSearchQuery('cube');
      const filtered = useAssetStore.getState().getFilteredAssets();

      expect(filtered.some((a) => a.name.toLowerCase().includes('cube'))).toBe(true);
    });

    it('should filter by search query matching tags', () => {
      useAssetStore.getState().setSearchQuery('basic');
      const filtered = useAssetStore.getState().getFilteredAssets();

      expect(filtered.every((a) => a.tags.some((t) => t.includes('basic')))).toBe(true);
    });

    it('should combine category and search filters', () => {
      useAssetStore.getState().setSelectedCategory(AssetCategory.Primitives);
      useAssetStore.getState().setSearchQuery('sphere');
      const filtered = useAssetStore.getState().getFilteredAssets();

      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Sphere');
    });

    it('should return empty array when no matches', () => {
      useAssetStore.getState().setSearchQuery('nonexistent');
      const filtered = useAssetStore.getState().getFilteredAssets();

      expect(filtered).toEqual([]);
    });

    it('should be case insensitive', () => {
      useAssetStore.getState().setSearchQuery('CUBE');
      const filtered = useAssetStore.getState().getFilteredAssets();

      expect(filtered.some((a) => a.name.toLowerCase() === 'cube')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useAssetStore.getState().setSelectedCategory(AssetCategory.Furniture);
      useAssetStore.getState().setSearchQuery('test');

      useAssetStore.getState().reset();

      expect(useAssetStore.getState().selectedCategory).toBeNull();
      expect(useAssetStore.getState().searchQuery).toBe('');
      expect(useAssetStore.getState().assets).toEqual(BUNDLED_ASSETS);
    });
  });

  describe('selectors', () => {
    describe('selectAssetById', () => {
      it('should return asset by id', () => {
        const state = useAssetStore.getState();
        const asset = selectAssetById(state, 'primitive-cube');

        expect(asset).toBeDefined();
        expect(asset?.name).toBe('Cube');
      });

      it('should return undefined for non-existent id', () => {
        const state = useAssetStore.getState();
        const asset = selectAssetById(state, 'non-existent');

        expect(asset).toBeUndefined();
      });
    });

    describe('selectAssetsByCategory', () => {
      it('should return assets by category', () => {
        const state = useAssetStore.getState();
        const assets = selectAssetsByCategory(state, AssetCategory.Primitives);

        expect(assets.length).toBeGreaterThan(0);
        expect(assets.every((a) => a.category === AssetCategory.Primitives)).toBe(true);
      });

      it('should return empty array for empty category', () => {
        const state = useAssetStore.getState();
        const assets = selectAssetsByCategory(state, AssetCategory.Furniture);

        expect(assets).toEqual([]);
      });
    });

    describe('selectAssetCount', () => {
      it('should return total asset count', () => {
        const state = useAssetStore.getState();
        const count = selectAssetCount(state);

        expect(count).toBe(BUNDLED_ASSETS.length);
      });
    });
  });
});
