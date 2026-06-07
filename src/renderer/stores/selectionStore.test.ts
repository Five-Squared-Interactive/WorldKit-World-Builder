import { describe, it, expect, beforeEach } from 'vitest';
import {
  useSelectionStore,
  selectPrimarySelection,
  selectHasMultipleSelection,
  selectHasSelection,
} from './selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useSelectionStore.setState({ selectedIds: [] });
  });

  describe('initial state', () => {
    it('starts with empty selectedIds', () => {
      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual([]);
    });
  });

  describe('setSelected', () => {
    it('sets selection to provided IDs', () => {
      useSelectionStore.getState().setSelected(['1', '2', '3']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '2', '3']);
    });

    it('replaces existing selection', () => {
      useSelectionStore.getState().setSelected(['1', '2']);
      useSelectionStore.getState().setSelected(['3', '4']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['3', '4']);
    });

    it('removes duplicates', () => {
      useSelectionStore.getState().setSelected(['1', '1', '2', '2']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '2']);
    });

    it('can set empty selection', () => {
      useSelectionStore.getState().setSelected(['1', '2']);
      useSelectionStore.getState().setSelected([]);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual([]);
    });
  });

  describe('addToSelection', () => {
    it('adds IDs to existing selection', () => {
      useSelectionStore.getState().setSelected(['1']);
      useSelectionStore.getState().addToSelection(['2', '3']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '2', '3']);
    });

    it('does not add duplicates', () => {
      useSelectionStore.getState().setSelected(['1', '2']);
      useSelectionStore.getState().addToSelection(['2', '3']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '2', '3']);
    });

    it('works with empty initial selection', () => {
      useSelectionStore.getState().addToSelection(['1', '2']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '2']);
    });
  });

  describe('removeFromSelection', () => {
    it('removes IDs from selection', () => {
      useSelectionStore.getState().setSelected(['1', '2', '3']);
      useSelectionStore.getState().removeFromSelection(['2']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '3']);
    });

    it('removes multiple IDs at once', () => {
      useSelectionStore.getState().setSelected(['1', '2', '3', '4']);
      useSelectionStore.getState().removeFromSelection(['1', '3']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['2', '4']);
    });

    it('ignores IDs not in selection', () => {
      useSelectionStore.getState().setSelected(['1', '2']);
      useSelectionStore.getState().removeFromSelection(['3', '4']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '2']);
    });
  });

  describe('clearSelection', () => {
    it('clears all selections', () => {
      useSelectionStore.getState().setSelected(['1', '2', '3']);
      useSelectionStore.getState().clearSelection();

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual([]);
    });
  });

  describe('toggleSelection', () => {
    it('adds unselected entity to selection', () => {
      useSelectionStore.getState().toggleSelection('1');

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toContain('1');
    });

    it('removes selected entity from selection', () => {
      useSelectionStore.getState().setSelected(['1', '2']);
      useSelectionStore.getState().toggleSelection('1');

      const state = useSelectionStore.getState();
      expect(state.selectedIds).not.toContain('1');
      expect(state.selectedIds).toContain('2');
    });
  });

  describe('isSelected', () => {
    it('returns true for selected entity', () => {
      useSelectionStore.getState().setSelected(['1', '2']);

      const result = useSelectionStore.getState().isSelected('1');

      expect(result).toBe(true);
    });

    it('returns false for unselected entity', () => {
      useSelectionStore.getState().setSelected(['1', '2']);

      const result = useSelectionStore.getState().isSelected('3');

      expect(result).toBe(false);
    });
  });

  describe('getSelectedCount', () => {
    it('returns 0 for empty selection', () => {
      const count = useSelectionStore.getState().getSelectedCount();

      expect(count).toBe(0);
    });

    it('returns correct count', () => {
      useSelectionStore.getState().setSelected(['1', '2', '3']);

      const count = useSelectionStore.getState().getSelectedCount();

      expect(count).toBe(3);
    });
  });

  describe('selectors', () => {
    describe('selectPrimarySelection', () => {
      it('returns first selected ID', () => {
        useSelectionStore.getState().setSelected(['first', 'second']);

        const primary = selectPrimarySelection(useSelectionStore.getState());

        expect(primary).toBe('first');
      });

      it('returns null for empty selection', () => {
        const primary = selectPrimarySelection(useSelectionStore.getState());

        expect(primary).toBeNull();
      });
    });

    describe('selectHasMultipleSelection', () => {
      it('returns true for multiple selections', () => {
        useSelectionStore.getState().setSelected(['1', '2']);

        const hasMultiple = selectHasMultipleSelection(useSelectionStore.getState());

        expect(hasMultiple).toBe(true);
      });

      it('returns false for single selection', () => {
        useSelectionStore.getState().setSelected(['1']);

        const hasMultiple = selectHasMultipleSelection(useSelectionStore.getState());

        expect(hasMultiple).toBe(false);
      });

      it('returns false for empty selection', () => {
        const hasMultiple = selectHasMultipleSelection(useSelectionStore.getState());

        expect(hasMultiple).toBe(false);
      });
    });

    describe('selectHasSelection', () => {
      it('returns true when entities are selected', () => {
        useSelectionStore.getState().setSelected(['1']);

        const hasSelection = selectHasSelection(useSelectionStore.getState());

        expect(hasSelection).toBe(true);
      });

      it('returns false when nothing is selected', () => {
        const hasSelection = selectHasSelection(useSelectionStore.getState());

        expect(hasSelection).toBe(false);
      });
    });
  });

  describe('cleanupDeletedIds', () => {
    it('removes IDs not in valid set', () => {
      useSelectionStore.getState().setSelected(['1', '2', '3']);

      useSelectionStore.getState().cleanupDeletedIds(new Set(['1', '3']));

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '3']);
    });

    it('accepts array as valid IDs', () => {
      useSelectionStore.getState().setSelected(['1', '2', '3']);

      useSelectionStore.getState().cleanupDeletedIds(['2']);

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['2']);
    });

    it('clears selection if no valid IDs remain', () => {
      useSelectionStore.getState().setSelected(['1', '2']);

      useSelectionStore.getState().cleanupDeletedIds(new Set(['3', '4']));

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual([]);
    });

    it('preserves all IDs if all are valid', () => {
      useSelectionStore.getState().setSelected(['1', '2']);

      useSelectionStore.getState().cleanupDeletedIds(new Set(['1', '2', '3']));

      const state = useSelectionStore.getState();
      expect(state.selectedIds).toEqual(['1', '2']);
    });
  });
});
