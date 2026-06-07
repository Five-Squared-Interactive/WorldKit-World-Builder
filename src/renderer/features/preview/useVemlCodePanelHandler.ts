/**
 * VEML Code Panel Handler Hook
 *
 * Listens for the View > Show VEML Code menu command
 * and toggles the VEML code panel visibility.
 */

import { useEffect } from 'react';
import { useUIStore, PanelId } from '../../stores';

/**
 * Hook to handle VEML code panel toggle from menu
 *
 * Subscribes to the view.onToggleVemlCode event and toggles
 * the VemlCode panel visibility in the UI store.
 */
export function useVemlCodePanelHandler(): void {
  const togglePanel = useUIStore((state) => state.togglePanel);

  useEffect(() => {
    // Subscribe to VEML code panel toggle events from menu
    const cleanup = window.worldkit?.view?.onToggleVemlCode?.(() => {
      togglePanel(PanelId.VemlCode);
    });

    return () => {
      cleanup?.();
    };
  }, [togglePanel]);
}
