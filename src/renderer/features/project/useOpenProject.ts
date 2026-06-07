/**
 * Open Project Hook
 *
 * Handles opening projects from disk.
 * Parses VEML content and reconstructs the scene.
 */

import { useCallback, useState, useEffect } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useCommandStore } from '../../stores/commandStore';
import { parseVeml } from '../../services/veml-parser';
import { hasUnsavedChanges } from './newProject';

interface UseOpenProjectResult {
  /** Whether an open operation is in progress */
  isOpening: boolean;
  /** Error message from last open attempt (null if no error) */
  lastError: string | null;
  /** Open a project (shows dialog and handles unsaved changes) */
  openProject: () => Promise<boolean>;
  /** Open a specific project by path */
  openProjectByPath: (path: string) => Promise<boolean>;
}

/**
 * Hook to manage project opening
 */
export function useOpenProject(): UseOpenProjectResult {
  const [isOpening, setIsOpening] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearScene = useSceneStore((state) => state.clearScene);
  const addEntity = useSceneStore((state) => state.addEntity);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const clearCommands = useCommandStore((state) => state.clear);
  const setProject = useProjectStore((state) => state.setProject);

  const openProject = useCallback(async (): Promise<boolean> => {
    if (isOpening) return false;

    // Check for unsaved changes
    if (hasUnsavedChanges()) {
      const result = await window.worldkit.project.showUnsavedChangesDialog();

      switch (result) {
        case 'save':
          // TODO: Trigger save first, then continue opening
          console.log('[project] Save requested before open - not fully implemented');
          break;
        case 'discard':
          // Continue with opening
          break;
        case 'cancel':
          return false;
      }
    }

    setIsOpening(true);
    setLastError(null);

    try {
      // Show open dialog and get project data
      const result = await window.worldkit.project.open();

      if (result.cancelled) {
        setIsOpening(false);
        return false;
      }

      if (!result.success || !result.vemlContent) {
        setLastError(result.error || 'Failed to open project');
        setIsOpening(false);
        return false;
      }

      // Parse VEML content
      const parseResult = parseVeml(result.vemlContent, result.path);

      if (!parseResult.success || !parseResult.entities) {
        setLastError(parseResult.error || 'Failed to parse project file');
        setIsOpening(false);
        return false;
      }

      // Clear existing scene
      clearScene();
      clearSelection();
      clearCommands();

      // Add entities from parsed VEML
      // Need to add entities in order (parents before children)
      const addedIds = new Set<string>();

      // First pass: add root entities
      for (const entity of parseResult.entities) {
        if (!entity.parentId) {
          addEntity(entity);
          addedIds.add(entity.id);
        }
      }

      // Second pass: add child entities (simplified - assumes flat or single-level nesting)
      for (const entity of parseResult.entities) {
        if (entity.parentId && !addedIds.has(entity.id)) {
          addEntity(entity, entity.parentId);
          addedIds.add(entity.id);
        }
      }

      // Set project metadata
      setProject(
        {
          name: result.name || parseResult.metadata?.name || 'Untitled World',
          path: result.path || null,
          lastSaved: new Date(),
          description: parseResult.metadata?.description || '',
          author: parseResult.metadata?.author || '',
        },
        false // Not a new project
      );

      // Update window title
      const title = `World Builder - ${result.name || parseResult.metadata?.name || 'Untitled World'}`;
      if (window.worldkit?.window?.setTitle) {
        await window.worldkit.window.setTitle(title);
      }

      console.log('[project] Opened successfully:', result.path);
      setIsOpening(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      console.error('[project] Open failed:', error);
      setIsOpening(false);
      return false;
    }
  }, [
    isOpening,
    clearScene,
    clearSelection,
    clearCommands,
    addEntity,
    setProject,
  ]);

  /**
   * Open a project directly by path (no dialog)
   */
  const openProjectByPath = useCallback(
    async (projectPath: string): Promise<boolean> => {
      if (isOpening) return false;

      // Check for unsaved changes
      if (hasUnsavedChanges()) {
        const result = await window.worldkit.project.showUnsavedChangesDialog();

        switch (result) {
          case 'save':
            console.log('[project] Save requested before open - not fully implemented');
            break;
          case 'discard':
            break;
          case 'cancel':
            return false;
        }
      }

      setIsOpening(true);
      setLastError(null);

      try {
        const result = await window.worldkit.project.openPath(projectPath);

        if (!result.success || !result.vemlContent) {
          setLastError(result.error || 'Failed to open project');
          setIsOpening(false);
          return false;
        }

        const parseResult = parseVeml(result.vemlContent, result.path);

        if (!parseResult.success || !parseResult.entities) {
          setLastError(parseResult.error || 'Failed to parse project file');
          setIsOpening(false);
          return false;
        }

        clearScene();
        clearSelection();
        clearCommands();

        const addedIds = new Set<string>();

        for (const entity of parseResult.entities) {
          if (!entity.parentId) {
            addEntity(entity);
            addedIds.add(entity.id);
          }
        }

        for (const entity of parseResult.entities) {
          if (entity.parentId && !addedIds.has(entity.id)) {
            addEntity(entity, entity.parentId);
            addedIds.add(entity.id);
          }
        }

        setProject(
          {
            name: result.name || parseResult.metadata?.name || 'Untitled World',
            path: result.path || null,
            lastSaved: new Date(),
            description: parseResult.metadata?.description || '',
            author: parseResult.metadata?.author || '',
          },
          false
        );

        const title = `World Builder - ${result.name || parseResult.metadata?.name || 'Untitled World'}`;
        if (window.worldkit?.window?.setTitle) {
          await window.worldkit.window.setTitle(title);
        }

        console.log('[project] Opened successfully:', result.path);
        setIsOpening(false);
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setLastError(errorMessage);
        console.error('[project] Open failed:', error);
        setIsOpening(false);
        return false;
      }
    },
    [isOpening, clearScene, clearSelection, clearCommands, addEntity, setProject]
  );

  /**
   * Listen for open triggers from menu
   */
  useEffect(() => {
    if (!window.worldkit?.project?.onOpenTrigger) {
      return;
    }

    const cleanup = window.worldkit.project.onOpenTrigger(() => {
      console.log('[project] Open triggered from menu');
      openProject();
    });

    return cleanup;
  }, [openProject]);

  /**
   * Listen for open recent project from menu
   */
  useEffect(() => {
    if (!window.worldkit?.project?.onOpenRecent) {
      return;
    }

    const cleanup = window.worldkit.project.onOpenRecent((path) => {
      console.log('[project] Open recent triggered from menu:', path);
      openProjectByPath(path);
    });

    return cleanup;
  }, [openProjectByPath]);

  return {
    isOpening,
    lastError,
    openProject,
    openProjectByPath,
  };
}
