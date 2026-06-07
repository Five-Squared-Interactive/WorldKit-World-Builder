/**
 * Asset Store
 *
 * Zustand store for managing the asset library.
 * Handles bundled assets, cached assets, and imported assets.
 */

import { create } from 'zustand';
import type { Asset } from '../types/asset';
import { AssetCategory, BUNDLED_ASSETS } from '../types/asset';

/**
 * Asset store state interface
 */
export interface AssetState {
  /** All available assets */
  assets: Asset[];

  /** Currently selected category filter (null = all) */
  selectedCategory: AssetCategory | null;

  /** Current search query */
  searchQuery: string;

  /** Whether assets are loading */
  isLoading: boolean;
}

/**
 * Asset store actions interface
 */
export interface AssetActions {
  /**
   * Set the selected category filter
   * @param category - Category to filter by, or null for all
   */
  setSelectedCategory: (category: AssetCategory | null) => void;

  /**
   * Set the search query
   * @param query - Search query string
   */
  setSearchQuery: (query: string) => void;

  /**
   * Add an imported asset
   * @param asset - The asset to add
   */
  addAsset: (asset: Asset) => void;

  /**
   * Remove an asset
   * @param id - The asset ID to remove
   */
  removeAsset: (id: string) => void;

  /**
   * Get filtered assets based on category and search query
   */
  getFilteredAssets: () => Asset[];

  /**
   * Reset to initial state
   */
  reset: () => void;
}

/**
 * Combined asset store type
 */
export type AssetStore = AssetState & AssetActions;

/**
 * Initial state for the asset store
 */
const initialState: AssetState = {
  assets: [...BUNDLED_ASSETS],
  selectedCategory: null,
  searchQuery: '',
  isLoading: false,
};

/**
 * Asset store instance
 */
export const useAssetStore = create<AssetStore>((set, get) => ({
  // State
  ...initialState,

  // Actions
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  addAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets, asset],
    })),

  removeAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    })),

  getFilteredAssets: () => {
    const { assets, selectedCategory, searchQuery } = get();
    const query = searchQuery.toLowerCase().trim();

    return assets.filter((asset) => {
      // Category filter
      if (selectedCategory && asset.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (query) {
        const matchesName = asset.name.toLowerCase().includes(query);
        const matchesTags = asset.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesName && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  },

  reset: () => set(initialState),
}));

/**
 * Selector: Get asset by ID
 */
export const selectAssetById = (state: AssetState, id: string): Asset | undefined =>
  state.assets.find((a) => a.id === id);

/**
 * Selector: Get assets by category
 */
export const selectAssetsByCategory = (state: AssetState, category: AssetCategory): Asset[] =>
  state.assets.filter((a) => a.category === category);

/**
 * Selector: Get asset count
 */
export const selectAssetCount = (state: AssetState): number => state.assets.length;
