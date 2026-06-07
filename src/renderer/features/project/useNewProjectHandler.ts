/**
 * New Project Handler Hook
 *
 * Listens for new project events from main process (menu)
 * and triggers opening the new project dialog.
 */

import { useEffect, useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { hasUnsavedChanges } from './newProject';

interface UseNewProjectHandlerResult {
  /** Whether the new project dialog should be shown */
  isDialogOpen: boolean;
  /** Open the new project dialog */
  openDialog: () => void;
  /** Close the new project dialog */
  closeDialog: () => void;
}

/**
 * Hook to manage new project dialog state and listen for menu events
 * Should be called once at app level (App.tsx or EditorLayout)
 */
export function useNewProjectHandler(): UseNewProjectHandlerResult {
  const isDialogOpen = useUIStore((state) => state.newProjectDialogOpen);
  const openNewProjectDialog = useUIStore((state) => state.openNewProjectDialog);
  const closeNewProjectDialog = useUIStore((state) => state.closeNewProjectDialog);

  const openDialog = useCallback(async () => {
    // Check for unsaved changes first
    if (hasUnsavedChanges()) {
      // Show native dialog asking what to do
      const result = await window.worldkit.project.showUnsavedChangesDialog();

      switch (result) {
        case 'save':
          // TODO: Implement save in Story 5.2
          console.log('[project] Save requested - not implemented yet, proceeding with dialog');
          break;
        case 'discard':
          // User wants to discard changes, continue to show dialog
          break;
        case 'cancel':
          // User cancelled, don't show dialog
          return;
      }
    }

    openNewProjectDialog();
  }, [openNewProjectDialog]);

  const closeDialog = useCallback(() => {
    closeNewProjectDialog();
  }, [closeNewProjectDialog]);

  useEffect(() => {
    // Guard for non-Electron environments (e.g., tests)
    if (!window.worldkit?.project?.onNewProject) {
      return;
    }

    // Register listener for new project events
    const cleanup = window.worldkit.project.onNewProject(() => {
      console.log('[project] Received new project event from menu');
      openDialog();
    });

    // Cleanup on unmount
    return cleanup;
  }, [openDialog]);

  return {
    isDialogOpen,
    openDialog,
    closeDialog,
  };
}
