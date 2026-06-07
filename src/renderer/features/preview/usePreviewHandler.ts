/**
 * Preview Handler Hook
 *
 * Listens for the View > Preview in WebVerse menu command (F5)
 * and triggers the preview launch.
 */

import { useEffect, useCallback } from 'react';
import { useUIStore, useSceneStore, useProjectStore } from '../../stores';
import { serializeToVeml } from '../../services/veml-serializer';

/**
 * Hook to handle preview trigger from menu (F5)
 *
 * Subscribes to the preview.onTrigger event and launches
 * the preview in WebVerse when triggered.
 */
export function usePreviewHandler(): void {
  const webverseStatus = useUIStore((state) => state.webverseStatus);
  const entities = useSceneStore((state) => state.entities);
  const rootIds = useSceneStore((state) => state.rootIds);
  const metadata = useProjectStore((state) => state.metadata);

  const handlePreviewTrigger = useCallback(async () => {
    if (!webverseStatus.installed) {
      // If WebVerse is not installed, we can't launch preview
      // The Toolbar will show the dialog when clicking the button
      console.log('WebVerse not installed, cannot launch preview from menu');
      return;
    }

    try {
      // Generate VEML content from current scene state
      const vemlContent = serializeToVeml(entities, rootIds, {
        name: metadata.name,
        description: metadata.description,
        author: metadata.author,
        includeXmlDeclaration: true,
      });

      // Launch preview
      const result = await window.worldkit.preview.launch({
        vemlContent,
        projectName: metadata.name,
      });

      if (!result.success) {
        console.error('Failed to launch preview:', result.error);
      }
    } catch (error) {
      console.error('Preview launch error:', error);
    }
  }, [webverseStatus, entities, rootIds, metadata]);

  useEffect(() => {
    // Subscribe to preview trigger events from menu
    const cleanup = window.worldkit?.preview?.onTrigger?.(handlePreviewTrigger);

    return () => {
      cleanup?.();
    };
  }, [handlePreviewTrigger]);
}
