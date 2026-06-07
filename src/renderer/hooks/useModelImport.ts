/**
 * useModelImport Hook
 *
 * Handles model import events from the main process menu.
 * Creates GLTF entities when the user imports a model via File > Import Model.
 */

import { useEffect } from 'react';
import { useSceneStore } from '../stores/sceneStore';
import { useUIStore } from '../stores/uiStore';
import { useCommandStore } from '../stores/commandStore';
import { createGltfEntity } from '../features/primitives/createPrimitive';
import { AddEntityCommand } from '../commands/AddEntityCommand';
import type { ImportModelResult } from '../../shared/types/ipc';

/**
 * Hook to handle model import events from the menu
 * Should be mounted once at the app level
 */
export function useModelImport(): void {
  const executeCommand = useCommandStore((state) => state.execute);

  useEffect(() => {
    // Check if we're in Electron environment
    if (typeof window === 'undefined' || !window.worldkit?.scene?.onImportModel) {
      return;
    }

    const handleImportModel = (result: ImportModelResult) => {
      if (!result.success || !result.filePath) {
        console.error('Import failed:', result.error);
        return;
      }

      const entities = useSceneStore.getState().entities;
      const existingNames = Object.values(entities).map((e) => e.name);
      const snappingEnabled = useUIStore.getState().snappingEnabled;

      const entity = createGltfEntity(result.filePath, existingNames);

      // Apply ground snapping if enabled
      if (snappingEnabled) {
        entity.transform.position.y = 0;
      }

      // Create and execute command
      const command = new AddEntityCommand(entity);
      executeCommand(command);
    };

    // Register the event listener
    const cleanup = window.worldkit.scene.onImportModel(handleImportModel);

    return cleanup;
  }, [executeCommand]);
}
