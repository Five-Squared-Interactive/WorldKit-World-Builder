/**
 * Save Project Hook
 *
 * Handles saving the current project to disk.
 * Listens for save triggers from menu and provides save functionality.
 */

import { useEffect, useCallback, useState } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { serializeToVeml, getReferencedModelFiles } from '../../services/veml-serializer';

interface UseSaveProjectResult {
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Error message from last save attempt (null if no error) */
  lastError: string | null;
  /** Last successful save timestamp */
  lastSaved: Date | null;
  /** Save the project (uses existing path or shows dialog) */
  saveProject: () => Promise<boolean>;
  /** Save the project to a new location */
  saveProjectAs: () => Promise<boolean>;
}

/**
 * Hook to manage project saving and listen for save triggers from menu
 */
export function useSaveProject(): UseSaveProjectResult {
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const entities = useSceneStore((state) => state.entities);
  const rootIds = useSceneStore((state) => state.rootIds);
  const metadata = useProjectStore((state) => state.metadata);
  const projectPath = useProjectStore((state) => state.metadata.path);
  const lastSaved = useProjectStore((state) => state.metadata.lastSaved);
  const updateMetadata = useProjectStore((state) => state.updateMetadata);
  const markClean = useProjectStore((state) => state.markClean);

  /**
   * Generate VEML content from current scene
   */
  const generateVeml = useCallback(() => {
    return serializeToVeml(entities, rootIds, {
      name: metadata.name,
      description: metadata.description,
      author: metadata.author,
    });
  }, [entities, rootIds, metadata]);

  /**
   * Save project to existing path or show save dialog
   */
  const saveProject = useCallback(async (): Promise<boolean> => {
    if (isSaving) return false;

    setIsSaving(true);
    setLastError(null);

    try {
      const vemlContent = generateVeml();
      const modelFiles = getReferencedModelFiles(entities);

      const result = await window.worldkit.project.save({
        projectName: metadata.name,
        path: projectPath || undefined,
        vemlContent,
        modelFiles,
      });

      if (result.cancelled) {
        // User cancelled save dialog, not an error
        setIsSaving(false);
        return false;
      }

      if (!result.success) {
        setLastError(result.error || 'Failed to save project');
        setIsSaving(false);
        return false;
      }

      // Update project metadata with save path
      if (result.path) {
        // Extract project name from path
        const pathParts = result.path.replace(/\\/g, '/').split('/');
        const folderName = pathParts[pathParts.length - 1].replace('.wk', '');

        updateMetadata({
          path: result.path,
          name: folderName,
        });
      }

      // Mark project as clean (no unsaved changes)
      markClean();

      // Update window title
      const title = `World Builder - ${metadata.name}`;
      if (window.worldkit?.window?.setTitle) {
        await window.worldkit.window.setTitle(title);
      }

      console.log('[project] Saved successfully to:', result.path);
      setIsSaving(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      console.error('[project] Save failed:', error);
      setIsSaving(false);
      return false;
    }
  }, [
    isSaving,
    generateVeml,
    entities,
    metadata,
    projectPath,
    updateMetadata,
    markClean,
  ]);

  /**
   * Save project to a new location (always shows save dialog)
   */
  const saveProjectAs = useCallback(async (): Promise<boolean> => {
    if (isSaving) return false;

    setIsSaving(true);
    setLastError(null);

    try {
      const vemlContent = generateVeml();
      const modelFiles = getReferencedModelFiles(entities);

      const result = await window.worldkit.project.saveAs({
        projectName: metadata.name,
        vemlContent,
        modelFiles,
      });

      if (result.cancelled) {
        setIsSaving(false);
        return false;
      }

      if (!result.success) {
        setLastError(result.error || 'Failed to save project');
        setIsSaving(false);
        return false;
      }

      // Update project metadata with new save path
      if (result.path) {
        const pathParts = result.path.replace(/\\/g, '/').split('/');
        const folderName = pathParts[pathParts.length - 1].replace('.wk', '');

        updateMetadata({
          path: result.path,
          name: folderName,
        });
      }

      markClean();

      const title = `World Builder - ${metadata.name}`;
      if (window.worldkit?.window?.setTitle) {
        await window.worldkit.window.setTitle(title);
      }

      console.log('[project] Saved as:', result.path);
      setIsSaving(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      console.error('[project] Save As failed:', error);
      setIsSaving(false);
      return false;
    }
  }, [isSaving, generateVeml, entities, metadata, updateMetadata, markClean]);

  /**
   * Listen for save triggers from menu
   */
  useEffect(() => {
    if (!window.worldkit?.project?.onSaveTrigger) {
      return;
    }

    const cleanup = window.worldkit.project.onSaveTrigger(() => {
      console.log('[project] Save triggered from menu');
      saveProject();
    });

    return cleanup;
  }, [saveProject]);

  return {
    isSaving,
    lastError,
    lastSaved,
    saveProject,
    saveProjectAs,
  };
}
