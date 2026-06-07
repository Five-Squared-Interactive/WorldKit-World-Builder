import { describe, it, expect, beforeEach } from 'vitest';
import {
  useUIStore,
  ToolMode,
  PanelId,
  selectIsPanelVisible,
  selectToolMode,
  selectIsToolMode,
  selectSnappingEnabled,
} from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useUIStore.getState().resetUI();
  });

  describe('initial state', () => {
    it('starts with Select tool mode', () => {
      const state = useUIStore.getState();
      expect(state.toolMode).toBe(ToolMode.Select);
    });

    it('starts with default panel visibility', () => {
      const state = useUIStore.getState();
      expect(state.panelVisibility[PanelId.Hierarchy]).toBe(true);
      expect(state.panelVisibility[PanelId.Properties]).toBe(true);
      expect(state.panelVisibility[PanelId.Assets]).toBe(false);
      expect(state.panelVisibility[PanelId.Timeline]).toBe(false);
    });

    it('starts with loading false', () => {
      const state = useUIStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });

    it('starts with welcome screen visible', () => {
      const state = useUIStore.getState();
      expect(state.showWelcome).toBe(true);
    });
  });

  describe('setToolMode', () => {
    it('changes tool mode to Move', () => {
      useUIStore.getState().setToolMode(ToolMode.Move);

      const state = useUIStore.getState();
      expect(state.toolMode).toBe(ToolMode.Move);
    });

    it('changes tool mode to Rotate', () => {
      useUIStore.getState().setToolMode(ToolMode.Rotate);

      const state = useUIStore.getState();
      expect(state.toolMode).toBe(ToolMode.Rotate);
    });

    it('changes tool mode to Scale', () => {
      useUIStore.getState().setToolMode(ToolMode.Scale);

      const state = useUIStore.getState();
      expect(state.toolMode).toBe(ToolMode.Scale);
    });

    it('changes tool mode back to Select', () => {
      useUIStore.getState().setToolMode(ToolMode.Move);
      useUIStore.getState().setToolMode(ToolMode.Select);

      const state = useUIStore.getState();
      expect(state.toolMode).toBe(ToolMode.Select);
    });
  });

  describe('togglePanel', () => {
    it('toggles panel from visible to hidden', () => {
      useUIStore.getState().togglePanel(PanelId.Hierarchy);

      const state = useUIStore.getState();
      expect(state.panelVisibility[PanelId.Hierarchy]).toBe(false);
    });

    it('toggles panel from hidden to visible', () => {
      useUIStore.getState().togglePanel(PanelId.Assets);

      const state = useUIStore.getState();
      expect(state.panelVisibility[PanelId.Assets]).toBe(true);
    });

    it('double toggle returns to original state', () => {
      useUIStore.getState().togglePanel(PanelId.Properties);
      useUIStore.getState().togglePanel(PanelId.Properties);

      const state = useUIStore.getState();
      expect(state.panelVisibility[PanelId.Properties]).toBe(true);
    });
  });

  describe('setPanelVisibility', () => {
    it('sets panel to visible', () => {
      useUIStore.getState().setPanelVisibility(PanelId.Assets, true);

      const state = useUIStore.getState();
      expect(state.panelVisibility[PanelId.Assets]).toBe(true);
    });

    it('sets panel to hidden', () => {
      useUIStore.getState().setPanelVisibility(PanelId.Hierarchy, false);

      const state = useUIStore.getState();
      expect(state.panelVisibility[PanelId.Hierarchy]).toBe(false);
    });

    it('does not affect other panels', () => {
      useUIStore.getState().setPanelVisibility(PanelId.Assets, true);

      const state = useUIStore.getState();
      expect(state.panelVisibility[PanelId.Hierarchy]).toBe(true);
      expect(state.panelVisibility[PanelId.Properties]).toBe(true);
    });
  });

  describe('setLoading', () => {
    it('sets loading to true with message', () => {
      useUIStore.getState().setLoading(true, 'Loading project...');

      const state = useUIStore.getState();
      expect(state.isLoading).toBe(true);
      expect(state.loadingMessage).toBe('Loading project...');
    });

    it('sets loading to true without message', () => {
      useUIStore.getState().setLoading(true);

      const state = useUIStore.getState();
      expect(state.isLoading).toBe(true);
      expect(state.loadingMessage).toBeNull();
    });

    it('sets loading to false and clears message', () => {
      useUIStore.getState().setLoading(true, 'Loading...');
      useUIStore.getState().setLoading(false);

      const state = useUIStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });
  });

  describe('setShowWelcome', () => {
    it('hides welcome screen', () => {
      useUIStore.getState().setShowWelcome(false);

      const state = useUIStore.getState();
      expect(state.showWelcome).toBe(false);
    });

    it('shows welcome screen', () => {
      useUIStore.getState().setShowWelcome(false);
      useUIStore.getState().setShowWelcome(true);

      const state = useUIStore.getState();
      expect(state.showWelcome).toBe(true);
    });
  });

  describe('resetUI', () => {
    it('resets all UI state to initial values', () => {
      // Modify various state
      useUIStore.getState().setToolMode(ToolMode.Rotate);
      useUIStore.getState().setPanelVisibility(PanelId.Assets, true);
      useUIStore.getState().setLoading(true, 'Test');
      useUIStore.getState().setShowWelcome(false);

      // Reset
      useUIStore.getState().resetUI();

      const state = useUIStore.getState();
      expect(state.toolMode).toBe(ToolMode.Select);
      expect(state.panelVisibility[PanelId.Assets]).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.showWelcome).toBe(true);
    });
  });

  describe('selectors', () => {
    describe('selectIsPanelVisible', () => {
      it('returns true for visible panel', () => {
        const isVisible = selectIsPanelVisible(
          useUIStore.getState(),
          PanelId.Hierarchy
        );
        expect(isVisible).toBe(true);
      });

      it('returns false for hidden panel', () => {
        const isVisible = selectIsPanelVisible(
          useUIStore.getState(),
          PanelId.Assets
        );
        expect(isVisible).toBe(false);
      });
    });

    describe('selectToolMode', () => {
      it('returns current tool mode', () => {
        useUIStore.getState().setToolMode(ToolMode.Move);

        const mode = selectToolMode(useUIStore.getState());

        expect(mode).toBe(ToolMode.Move);
      });
    });

    describe('selectIsToolMode', () => {
      it('returns true when in specified mode', () => {
        useUIStore.getState().setToolMode(ToolMode.Rotate);

        const isRotate = selectIsToolMode(useUIStore.getState(), ToolMode.Rotate);

        expect(isRotate).toBe(true);
      });

      it('returns false when not in specified mode', () => {
        useUIStore.getState().setToolMode(ToolMode.Select);

        const isRotate = selectIsToolMode(useUIStore.getState(), ToolMode.Rotate);

        expect(isRotate).toBe(false);
      });
    });

    describe('selectSnappingEnabled', () => {
      it('returns current snapping state', () => {
        const isEnabled = selectSnappingEnabled(useUIStore.getState());

        expect(isEnabled).toBe(true); // Default is true
      });
    });
  });

  describe('Snapping', () => {
    it('should have snapping enabled by default', () => {
      expect(useUIStore.getState().snappingEnabled).toBe(true);
    });

    it('should toggle snapping with toggleSnapping', () => {
      expect(useUIStore.getState().snappingEnabled).toBe(true);

      useUIStore.getState().toggleSnapping();

      expect(useUIStore.getState().snappingEnabled).toBe(false);

      useUIStore.getState().toggleSnapping();

      expect(useUIStore.getState().snappingEnabled).toBe(true);
    });

    it('should set snapping with setSnapping', () => {
      useUIStore.getState().setSnapping(false);
      expect(useUIStore.getState().snappingEnabled).toBe(false);

      useUIStore.getState().setSnapping(true);
      expect(useUIStore.getState().snappingEnabled).toBe(true);
    });

    it('should reset snapping to default on resetUI', () => {
      useUIStore.getState().setSnapping(false);
      expect(useUIStore.getState().snappingEnabled).toBe(false);

      useUIStore.getState().resetUI();

      expect(useUIStore.getState().snappingEnabled).toBe(true);
    });
  });
});
