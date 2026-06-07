/**
 * New Project Logic
 *
 * Functions for creating a new blank world.
 * Resets the scene graph and project metadata.
 */

import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';

/**
 * Create a new blank world by resetting all stores
 *
 * This function:
 * 1. Clears all entities from the scene store
 * 2. Resets project metadata to defaults (name: "Untitled World", isNew: true)
 *
 * Note: The Three.js viewport will continue to show the grid and lighting
 * as those are part of the viewport itself, not the scene store.
 */
export function createBlankWorld(): void {
  // Reset scene graph (removes all entities)
  useSceneStore.getState().clearScene();

  // Reset project metadata (sets name to "Untitled World", isNew=true, isDirty=false)
  useProjectStore.getState().newProject();
}

/**
 * Check if there are unsaved changes that need to be handled
 * @returns true if there are unsaved changes
 */
export function hasUnsavedChanges(): boolean {
  return useProjectStore.getState().isDirty;
}

/**
 * Handle the new project action with unsaved changes check
 * Shows a dialog if there are unsaved changes and handles user response
 *
 * @returns true if new project was created, false if user cancelled
 */
export async function handleNewProject(): Promise<boolean> {
  // Check for unsaved changes
  if (hasUnsavedChanges()) {
    // Show native dialog asking what to do
    const result = await window.worldkit.project.showUnsavedChangesDialog();

    switch (result) {
      case 'save':
        // TODO: Implement save in Story 5.2
        // For now, just proceed with creating new project
        console.log('[project] Save requested - not implemented yet, proceeding with new project');
        break;
      case 'discard':
        // User wants to discard changes, continue to create new project
        break;
      case 'cancel':
        // User cancelled, don't create new project
        return false;
    }
  }

  // Create the new blank world
  createBlankWorld();
  return true;
}
