/**
 * useEditMenuHandler Hook
 *
 * Subscribes to edit menu events (undo, redo, delete) from the main process
 * and triggers the corresponding actions in the command store.
 */

import { useEffect } from 'react';
import { useCommandStore, useSelectionStore, useSceneStore } from '../stores';
import { DeleteEntityCommand } from '../commands';

/**
 * Hook to handle edit menu events from main process
 * Connects menu Edit > Undo/Redo/Delete to the command stack
 */
export function useEditMenuHandler(): void {
  const undo = useCommandStore((state) => state.undo);
  const redo = useCommandStore((state) => state.redo);
  const execute = useCommandStore((state) => state.execute);
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const getEntity = useSceneStore((state) => state.getEntity);

  useEffect(() => {
    // Subscribe to undo event from menu
    const cleanupUndo = window.worldkit?.edit?.onUndo?.(() => {
      undo();
    });

    // Subscribe to redo event from menu
    const cleanupRedo = window.worldkit?.edit?.onRedo?.(() => {
      redo();
    });

    // Subscribe to delete event from menu
    const cleanupDelete = window.worldkit?.edit?.onDelete?.(() => {
      if (selectedIds.length > 0) {
        // Get entities to delete
        const entitiesToDelete = selectedIds
          .map((id) => getEntity(id))
          .filter((e): e is NonNullable<typeof e> => e !== undefined);

        if (entitiesToDelete.length > 0) {
          const command = new DeleteEntityCommand(entitiesToDelete);
          execute(command);
        }
      }
    });

    return () => {
      cleanupUndo?.();
      cleanupRedo?.();
      cleanupDelete?.();
    };
  }, [undo, redo, execute, selectedIds, getEntity]);
}
