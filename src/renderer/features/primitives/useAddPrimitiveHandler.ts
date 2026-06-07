/**
 * useAddPrimitiveHandler Hook
 *
 * Listens for add-primitive events from the main process (menu).
 * Calls handleAddPrimitive when events are received.
 */

import { useEffect } from 'react';
import { handleAddPrimitive } from './handleAddPrimitive';

/**
 * Hook to handle add-primitive events from the main process
 *
 * Registers a listener for the worldkit:scene:add-primitive IPC channel
 * and calls handleAddPrimitive when events are received.
 */
export function useAddPrimitiveHandler(): void {
  useEffect(() => {
    // Check if worldkit API is available (won't be in non-Electron environments)
    if (!window.worldkit?.scene?.onAddPrimitive) {
      return;
    }

    // Register listener for add-primitive events
    const cleanup = window.worldkit.scene.onAddPrimitive((type) => {
      handleAddPrimitive(type);
    });

    return cleanup;
  }, []);
}
