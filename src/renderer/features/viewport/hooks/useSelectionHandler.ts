/**
 * useSelectionHandler Hook
 *
 * Integrates object picking with selectionStore for viewport click-to-select.
 * Handles click vs drag detection to prevent selection on camera orbit.
 * Supports multi-select via Shift+click (add) and Ctrl/Cmd+click (toggle).
 */

import { useCallback, useRef } from 'react';
import { useSelectionStore } from '../../../stores';

/**
 * Modifier key state for multi-select operations
 */
export interface ModifierKeys {
  /** Shift key held - adds to selection */
  shiftKey: boolean;
  /** Ctrl/Cmd key held - toggles selection */
  ctrlKey: boolean;
}

/** Default modifier state (no modifiers) */
export const DEFAULT_MODIFIERS: ModifierKeys = { shiftKey: false, ctrlKey: false };

/**
 * Hook for handling viewport selection
 *
 * @param getEntityAtPoint - Function that returns entity ID at screen position
 * @param isDragDistance - Function to check if mouse moved beyond drag threshold (from useObjectPicking)
 * @returns Selection handler functions
 */
export function useSelectionHandler(
  getEntityAtPoint: (x: number, y: number) => string | null,
  isDragDistance: (startX: number, startY: number, endX: number, endY: number) => boolean
) {
  const setSelected = useSelectionStore((state) => state.setSelected);
  const addToSelection = useSelectionStore((state) => state.addToSelection);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  /**
   * Store mouse down position for drag detection
   */
  const handleMouseDown = useCallback((x: number, y: number) => {
    mouseDownPosRef.current = { x, y };
  }, []);

  /**
   * Get the stored mouse down position
   */
  const getMouseDownPosition = useCallback(() => {
    return { ...mouseDownPosRef.current };
  }, []);

  /**
   * Handle direct click with optional modifier key support for multi-select
   *
   * Behavior:
   * - No modifiers: Replace selection with clicked entity (or clear if empty space)
   * - Shift+click: Add clicked entity to selection
   * - Ctrl/Cmd+click: Toggle clicked entity in selection
   * - Modifiers + empty space: Do nothing (preserve selection)
   */
  const handleClick = useCallback(
    (x: number, y: number, modifiers: ModifierKeys = DEFAULT_MODIFIERS) => {
      const entityId = getEntityAtPoint(x, y);

      if (entityId) {
        if (modifiers.shiftKey) {
          // Shift+click: Add to selection
          addToSelection([entityId]);
        } else if (modifiers.ctrlKey) {
          // Ctrl/Cmd+click: Toggle selection
          toggleSelection(entityId);
        } else {
          // Regular click: Replace selection
          setSelected([entityId]);
        }
      } else {
        // Click on empty space
        if (!modifiers.shiftKey && !modifiers.ctrlKey) {
          // No modifiers: Clear selection
          clearSelection();
        }
        // With modifiers held, clicking empty space does nothing
      }
    },
    [getEntityAtPoint, setSelected, addToSelection, toggleSelection, clearSelection]
  );

  /**
   * Process click with drag detection and optional modifier support
   * Only performs selection if the click wasn't a drag operation
   */
  const processClick = useCallback(
    (x: number, y: number, modifiers: ModifierKeys = DEFAULT_MODIFIERS) => {
      const { x: startX, y: startY } = mouseDownPosRef.current;

      // Check if this was a drag (camera orbit, pan, etc.)
      if (isDragDistance(startX, startY, x, y)) {
        return; // Don't select on drag
      }

      // Not a drag, perform selection
      handleClick(x, y, modifiers);
    },
    [isDragDistance, handleClick]
  );

  return {
    handleMouseDown,
    handleClick,
    processClick,
    getMouseDownPosition,
  };
}
