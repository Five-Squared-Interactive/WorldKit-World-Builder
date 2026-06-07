/**
 * useKeyboardShortcuts Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useUIStore, ToolMode } from '../stores/uiStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useCommandStore } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // Reset all stores
    useUIStore.getState().resetUI();
    useSelectionStore.getState().clearSelection();
    useCommandStore.getState().clear();
    useSceneStore.getState().clearScene();
  });

  const simulateKeyDown = (
    key: string,
    options: Partial<KeyboardEventInit> = {}
  ) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    window.dispatchEvent(event);
    return event;
  };

  describe('Tool Mode Shortcuts', () => {
    it('should switch to Move mode when G is pressed', () => {
      renderHook(() => useKeyboardShortcuts());

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Select);

      simulateKeyDown('g');

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Move);
    });

    it('should switch to Rotate mode when R is pressed', () => {
      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('r');

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Rotate);
    });

    it('should switch to Scale mode when S is pressed', () => {
      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('s');

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Scale);
    });

    it('should switch to Select mode when Escape is pressed', () => {
      renderHook(() => useKeyboardShortcuts());

      // First switch to a different mode
      useUIStore.getState().setToolMode(ToolMode.Move);
      expect(useUIStore.getState().toolMode).toBe(ToolMode.Move);

      simulateKeyDown('Escape');

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Select);
    });

    it('should handle uppercase keys', () => {
      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('G');

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Move);
    });
  });

  describe('Delete Shortcut', () => {
    it('should delete selected objects when Delete is pressed', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      expect(useSceneStore.getState().entities['entity-1']).toBeDefined();

      simulateKeyDown('Delete');

      expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
    });

    it('should delete selected objects when Backspace is pressed', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('Backspace');

      expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
    });

    it('should delete multiple selected objects', () => {
      const entity1 = createEntity('entity-1', 'Entity 1', EntityType.CubeMesh);
      const entity2 = createEntity('entity-2', 'Entity 2', EntityType.SphereMesh);
      useSceneStore.getState().addEntity(entity1);
      useSceneStore.getState().addEntity(entity2);
      useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);

      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('Delete');

      expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
      expect(useSceneStore.getState().entities['entity-2']).toBeUndefined();
    });

    it('should not do anything when Delete is pressed with no selection', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('Delete');

      // Entity should still exist
      expect(useSceneStore.getState().entities['entity-1']).toBeDefined();
    });

    it('should create undo-able command when deleting', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('Delete');

      expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();

      // Undo should restore the entity
      useCommandStore.getState().undo();

      expect(useSceneStore.getState().entities['entity-1']).toBeDefined();
    });
  });

  describe('Duplicate Shortcut', () => {
    it('should duplicate selected objects when Ctrl+D is pressed', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      expect(Object.keys(useSceneStore.getState().entities).length).toBe(1);

      simulateKeyDown('d', { ctrlKey: true });

      expect(Object.keys(useSceneStore.getState().entities).length).toBe(2);
    });

    it('should not duplicate when Ctrl+D is pressed with no selection', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('d', { ctrlKey: true });

      expect(Object.keys(useSceneStore.getState().entities).length).toBe(1);
    });

    it('should select duplicated entity after duplication', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('d', { ctrlKey: true });

      const selectedIds = useSelectionStore.getState().selectedIds;
      expect(selectedIds.length).toBe(1);
      expect(selectedIds[0]).not.toBe('entity-1');
    });

    it('should create undo-able command when duplicating', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('d', { ctrlKey: true });

      expect(Object.keys(useSceneStore.getState().entities).length).toBe(2);

      // Undo should remove the duplicate
      useCommandStore.getState().undo();

      expect(Object.keys(useSceneStore.getState().entities).length).toBe(1);
    });
  });

  describe('Undo/Redo Shortcuts', () => {
    it('should undo when Ctrl+Z is pressed', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      // Delete to create something to undo
      simulateKeyDown('Delete');
      expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();

      // Undo with Ctrl+Z
      simulateKeyDown('z', { ctrlKey: true });

      expect(useSceneStore.getState().entities['entity-1']).toBeDefined();
    });

    it('should redo when Ctrl+Y is pressed', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      // Delete and undo
      simulateKeyDown('Delete');
      simulateKeyDown('z', { ctrlKey: true });
      expect(useSceneStore.getState().entities['entity-1']).toBeDefined();

      // Redo with Ctrl+Y
      simulateKeyDown('y', { ctrlKey: true });

      expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
    });

    it('should redo when Ctrl+Shift+Z is pressed', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      // Delete and undo
      simulateKeyDown('Delete');
      simulateKeyDown('z', { ctrlKey: true });
      expect(useSceneStore.getState().entities['entity-1']).toBeDefined();

      // Redo with Ctrl+Shift+Z
      simulateKeyDown('z', { ctrlKey: true, shiftKey: true });

      expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
    });

    it('should support Cmd key on macOS', () => {
      const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useKeyboardShortcuts());

      // Delete
      simulateKeyDown('Delete');
      expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();

      // Undo with Cmd+Z (metaKey)
      simulateKeyDown('z', { metaKey: true });

      expect(useSceneStore.getState().entities['entity-1']).toBeDefined();
    });
  });

  describe('Input Focus Behavior', () => {
    it('should not trigger shortcuts when input is focused', () => {
      renderHook(() => useKeyboardShortcuts());

      // Create and focus an input
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Select);

      simulateKeyDown('g');

      // Tool mode should not change
      expect(useUIStore.getState().toolMode).toBe(ToolMode.Select);

      // Cleanup
      document.body.removeChild(input);
    });

    it('should not trigger shortcuts when textarea is focused', () => {
      renderHook(() => useKeyboardShortcuts());

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      simulateKeyDown('r');

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Select);

      document.body.removeChild(textarea);
    });

    it('should not trigger shortcuts when contenteditable is focused', () => {
      renderHook(() => useKeyboardShortcuts());

      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);
      div.focus();

      simulateKeyDown('s');

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Select);

      document.body.removeChild(div);
    });
  });

  describe('Modifier Key Behavior', () => {
    it('should not trigger tool shortcuts with Ctrl held', () => {
      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('g', { ctrlKey: true });

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Select);
    });

    it('should not trigger tool shortcuts with Alt held', () => {
      renderHook(() => useKeyboardShortcuts());

      simulateKeyDown('g', { altKey: true });

      expect(useUIStore.getState().toolMode).toBe(ToolMode.Select);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listener on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useKeyboardShortcuts());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
