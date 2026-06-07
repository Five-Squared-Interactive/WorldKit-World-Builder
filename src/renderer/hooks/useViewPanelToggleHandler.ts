/**
 * useViewPanelToggleHandler Hook
 *
 * Subscribes to view menu panel toggle events from the main process
 * and toggles the corresponding panel visibility in the UI store.
 */

import { useEffect } from 'react';
import { useUIStore, PanelId } from '../stores';

/**
 * Hook to handle view menu panel toggle events from main process
 * Connects menu View > Toggle panels to the UI store
 */
export function useViewPanelToggleHandler(): void {
  const togglePanel = useUIStore((state) => state.togglePanel);

  useEffect(() => {
    // Subscribe to scene tree toggle from menu (Ctrl+1)
    const cleanupSceneTree = window.worldkit?.view?.onToggleSceneTree?.(() => {
      togglePanel(PanelId.Hierarchy);
    });

    // Subscribe to properties toggle from menu (Ctrl+2)
    const cleanupProperties = window.worldkit?.view?.onToggleProperties?.(() => {
      togglePanel(PanelId.Properties);
    });

    // Subscribe to asset library toggle from menu (Ctrl+3)
    const cleanupAssetLibrary = window.worldkit?.view?.onToggleAssetLibrary?.(() => {
      togglePanel(PanelId.Assets);
    });

    return () => {
      cleanupSceneTree?.();
      cleanupProperties?.();
      cleanupAssetLibrary?.();
    };
  }, [togglePanel]);
}
