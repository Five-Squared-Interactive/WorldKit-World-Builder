/**
 * useExportHandler Hook
 *
 * Handles VEML export triggered from the menu.
 * Serializes the current scene and saves to a file.
 */

import { useEffect, useCallback } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { serializeToVeml } from '../../services/veml-serializer';

/**
 * Hook that handles export trigger from menu
 */
export function useExportHandler(): void {
  const entities = useSceneStore((state) => state.entities);
  const rootIds = useSceneStore((state) => state.rootIds);
  const metadata = useProjectStore((state) => state.metadata);

  const handleExport = useCallback(async () => {
    try {
      // Serialize the scene to VEML
      const vemlContent = serializeToVeml(entities, rootIds, {
        name: metadata.name,
        description: metadata.description,
        author: metadata.author,
        includeXmlDeclaration: true,
      });

      // Export via IPC
      const result = await window.worldkit.export.exportVeml({
        vemlContent,
        suggestedName: metadata.name || 'world',
      });

      if (result.success) {
        console.log('[export] VEML exported successfully to:', result.path);
        // TODO: Show success toast
      } else if (!result.cancelled) {
        console.error('[export] Failed to export VEML:', result.error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('[export] Export failed:', error);
    }
  }, [entities, rootIds, metadata]);

  useEffect(() => {
    // Listen for export trigger from menu
    const cleanup = window.worldkit.export.onExportTrigger(handleExport);
    return cleanup;
  }, [handleExport]);
}
