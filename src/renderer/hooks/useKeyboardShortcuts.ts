/**
 * useKeyboardShortcuts Hook
 *
 * Handles keyboard shortcuts for the editor.
 * Shortcuts are disabled when focus is on input elements.
 */

import { useEffect, useCallback } from 'react';
import { useUIStore, ToolMode } from '../stores/uiStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useCommandStore } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { DeleteEntityCommand } from '../commands/DeleteEntityCommand';
import { DuplicateEntityCommand } from '../commands/DuplicateEntityCommand';
import { GroupEntitiesCommand } from '../commands/GroupEntitiesCommand';
import { UngroupEntitiesCommand } from '../commands/UngroupEntitiesCommand';
import { CutEntitiesCommand } from '../commands/CutEntitiesCommand';
import { PasteEntitiesCommand } from '../commands/PasteEntitiesCommand';
import { useClipboardStore } from '../stores/clipboardStore';
import { EntityType } from '../types/entity';
import { handleAddPrimitive } from '../features/primitives/handleAddPrimitive';

/**
 * Check if the currently focused element is an input-like element
 * where keyboard shortcuts should be disabled
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  // Check for contenteditable elements
  if (activeElement.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Hook that sets up keyboard shortcuts for the editor
 */
export function useKeyboardShortcuts(): void {
  const setToolMode = useUIStore((state) => state.setToolMode);
  const toolMode = useUIStore((state) => state.toolMode);
  const openNewProjectDialog = useUIStore((state) => state.openNewProjectDialog);
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const setSelected = useSelectionStore((state) => state.setSelected);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const executeCommand = useCommandStore((state) => state.execute);
  const undo = useCommandStore((state) => state.undo);
  const redo = useCommandStore((state) => state.redo);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (isInputFocused()) {
        return;
      }

      const key = event.key.toLowerCase();
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // New Project: Ctrl+N
      if (isCtrlOrCmd && key === 'n') {
        event.preventDefault();
        openNewProjectDialog();
        return;
      }

      // Undo: Ctrl+Z
      if (isCtrlOrCmd && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (isCtrlOrCmd && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
      }

      // Select All: Ctrl+A
      if (isCtrlOrCmd && key === 'a') {
        event.preventDefault();
        const allEntityIds = Object.keys(useSceneStore.getState().entities);
        setSelected(allEntityIds);
        return;
      }

      // Cut: Ctrl+X
      if (isCtrlOrCmd && key === 'x') {
        event.preventDefault();
        if (selectedIds.length > 0) {
          const command = new CutEntitiesCommand([...selectedIds]);
          executeCommand(command);
        }
        return;
      }

      // Copy: Ctrl+C (not a command - just updates clipboard)
      if (isCtrlOrCmd && key === 'c') {
        event.preventDefault();
        if (selectedIds.length > 0) {
          useClipboardStore.getState().copyEntities([...selectedIds]);
        }
        return;
      }

      // Paste: Ctrl+V
      if (isCtrlOrCmd && key === 'v') {
        event.preventDefault();
        if (useClipboardStore.getState().hasContent()) {
          const command = new PasteEntitiesCommand();
          executeCommand(command);
        }
        return;
      }

      // Duplicate: Ctrl+D
      if (isCtrlOrCmd && key === 'd') {
        event.preventDefault();
        if (selectedIds.length > 0) {
          const command = new DuplicateEntityCommand([...selectedIds]);
          executeCommand(command);
        }
        return;
      }

      // Group: Ctrl+G
      if (isCtrlOrCmd && key === 'g' && !event.shiftKey) {
        event.preventDefault();
        if (selectedIds.length > 0) {
          const command = new GroupEntitiesCommand([...selectedIds]);
          executeCommand(command);
        }
        return;
      }

      // Ungroup: Ctrl+Shift+G
      if (isCtrlOrCmd && key === 'g' && event.shiftKey) {
        event.preventDefault();
        if (selectedIds.length === 1) {
          const entity = useSceneStore.getState().getEntity(selectedIds[0]);
          if (entity && entity.type === EntityType.Group) {
            const command = new UngroupEntitiesCommand(selectedIds[0]);
            executeCommand(command);
          }
        }
        return;
      }

      // Add primitive shortcuts (Shift+1/2/3)
      if (event.shiftKey && !isCtrlOrCmd && !event.altKey) {
        switch (key) {
          case '1':
            event.preventDefault();
            handleAddPrimitive('cube');
            return;
          case '2':
            event.preventDefault();
            handleAddPrimitive('sphere');
            return;
          case '3':
            event.preventDefault();
            handleAddPrimitive('plane');
            return;
        }
      }

      // Tool mode shortcuts (only when no modifier keys)
      if (!isCtrlOrCmd && !event.altKey) {
        switch (key) {
          case 'g':
            // G for Grab/Move
            event.preventDefault();
            setToolMode(ToolMode.Move);
            return;

          case 'r':
            // R for Rotate
            event.preventDefault();
            setToolMode(ToolMode.Rotate);
            return;

          case 's':
            // S for Scale
            event.preventDefault();
            setToolMode(ToolMode.Scale);
            return;

          case 'escape':
            // Escape clears selection and returns to Select mode
            event.preventDefault();
            clearSelection();
            setToolMode(ToolMode.Select);
            return;

          case 'delete':
          case 'backspace':
            // Delete selected objects
            if (selectedIds.length > 0) {
              event.preventDefault();
              const command = new DeleteEntityCommand([...selectedIds]);
              executeCommand(command);
            }
            return;
        }
      }
    },
    [setToolMode, openNewProjectDialog, selectedIds, setSelected, clearSelection, executeCommand, undo, redo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
