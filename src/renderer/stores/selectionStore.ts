/**
 * Selection Store
 *
 * Zustand store for managing entity selection state.
 * Decoupled from scene data for clean separation of concerns.
 */

import { create } from 'zustand';

/**
 * Selection store state interface
 */
export interface SelectionState {
  /** Array of selected entity IDs */
  selectedIds: string[];
}

/**
 * Selection store actions interface
 */
export interface SelectionActions {
  /**
   * Set the selection to specific entities (replaces current selection)
   * @param ids - Array of entity IDs to select
   */
  setSelected: (ids: string[]) => void;

  /**
   * Add entities to the current selection
   * @param ids - Array of entity IDs to add
   */
  addToSelection: (ids: string[]) => void;

  /**
   * Remove entities from the current selection
   * @param ids - Array of entity IDs to remove
   */
  removeFromSelection: (ids: string[]) => void;

  /**
   * Clear all selections
   */
  clearSelection: () => void;

  /**
   * Toggle selection of a single entity
   * @param id - Entity ID to toggle
   */
  toggleSelection: (id: string) => void;

  /**
   * Check if an entity is selected
   * @param id - Entity ID to check
   */
  isSelected: (id: string) => boolean;

  /**
   * Get the count of selected entities
   */
  getSelectedCount: () => number;

  /**
   * Remove any selected IDs that no longer exist in the provided valid IDs set
   * Call this after entities are removed from the scene
   * @param validIds - Set or array of IDs that still exist
   */
  cleanupDeletedIds: (validIds: Set<string> | string[]) => void;
}

/**
 * Combined selection store type
 */
export type SelectionStore = SelectionState & SelectionActions;

/**
 * Initial state for the selection store
 */
const initialState: SelectionState = {
  selectedIds: [],
};

/**
 * Selection store instance
 */
export const useSelectionStore = create<SelectionStore>((set, get) => ({
  // State
  ...initialState,

  // Actions
  setSelected: (ids) =>
    set({
      selectedIds: [...new Set(ids)], // Remove duplicates
    }),

  addToSelection: (ids) =>
    set((state) => ({
      selectedIds: [...new Set([...state.selectedIds, ...ids])],
    })),

  removeFromSelection: (ids) =>
    set((state) => {
      // Use Set for O(n) instead of O(n²) with includes()
      const idsToRemove = new Set(ids);
      return {
        selectedIds: state.selectedIds.filter((id) => !idsToRemove.has(id)),
      };
    }),

  clearSelection: () => set({ selectedIds: [] }),

  toggleSelection: (id) =>
    set((state) => {
      if (state.selectedIds.includes(id)) {
        return {
          selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
        };
      }
      return {
        selectedIds: [...state.selectedIds, id],
      };
    }),

  // Selectors
  isSelected: (id) => get().selectedIds.includes(id),

  getSelectedCount: () => get().selectedIds.length,

  cleanupDeletedIds: (validIds) => {
    const validSet = validIds instanceof Set ? validIds : new Set(validIds);
    set((state) => ({
      selectedIds: state.selectedIds.filter((id) => validSet.has(id)),
    }));
  },
}));

/**
 * Selector: Get first selected entity ID (primary selection)
 */
export const selectPrimarySelection = (state: SelectionState): string | null =>
  state.selectedIds.length > 0 ? state.selectedIds[0] : null;

/**
 * Selector: Check if multiple entities are selected
 */
export const selectHasMultipleSelection = (state: SelectionState): boolean =>
  state.selectedIds.length > 1;

/**
 * Selector: Check if any entity is selected
 */
export const selectHasSelection = (state: SelectionState): boolean =>
  state.selectedIds.length > 0;
