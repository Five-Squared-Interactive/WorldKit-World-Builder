/**
 * useSelectionHandler Hook Tests
 *
 * Tests for the selection handler that integrates object picking with selectionStore.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelectionHandler } from './useSelectionHandler';
import { useSelectionStore } from '../../../stores';

describe('useSelectionHandler', () => {
  // Default mock that always returns false (not a drag)
  const mockIsDragDistance = vi.fn().mockReturnValue(false);

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDragDistance.mockReturnValue(false);
    // Reset selection store before each test
    useSelectionStore.getState().clearSelection();
  });

  describe('handleClick', () => {
    it('should select entity when getEntityAtPoint returns an ID', () => {
      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-123');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200);
      });

      expect(mockGetEntityAtPoint).toHaveBeenCalledWith(100, 200);
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-123']);
    });

    it('should clear selection when getEntityAtPoint returns null', () => {
      // First set some selection
      useSelectionStore.getState().setSelected(['existing-entity']);
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue(null);

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200);
      });

      expect(useSelectionStore.getState().selectedIds).toEqual([]);
    });

    it('should replace existing selection with new entity', () => {
      // Set initial selection
      useSelectionStore.getState().setSelected(['entity-old']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-new');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200);
      });

      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-new']);
    });

    it('should handle multiple consecutive clicks', () => {
      const mockGetEntityAtPoint = vi.fn()
        .mockReturnValueOnce('entity-1')
        .mockReturnValueOnce('entity-2')
        .mockReturnValueOnce(null);

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      // First click - select entity-1
      act(() => {
        result.current.handleClick(100, 100);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);

      // Second click - select entity-2 (replace)
      act(() => {
        result.current.handleClick(200, 200);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-2']);

      // Third click - empty space (clear)
      act(() => {
        result.current.handleClick(300, 300);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual([]);
    });
  });

  describe('handleMouseDown', () => {
    it('should store mouse down position', () => {
      const mockGetEntityAtPoint = vi.fn();

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleMouseDown(150, 250);
      });

      // The position is stored internally - we verify by checking
      // that processClick uses it correctly
      expect(result.current.getMouseDownPosition()).toEqual({ x: 150, y: 250 });
    });
  });

  describe('processClick', () => {
    it('should not select if click was a drag', () => {
      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-123');
      const dragCheckMock = vi.fn().mockReturnValue(true);

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, dragCheckMock)
      );

      act(() => {
        result.current.handleMouseDown(100, 100);
      });

      act(() => {
        result.current.processClick(200, 200); // Far from mousedown
      });

      // Should not call getEntityAtPoint or select anything
      expect(mockGetEntityAtPoint).not.toHaveBeenCalled();
      expect(useSelectionStore.getState().selectedIds).toEqual([]);
    });

    it('should select if click was not a drag', () => {
      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-123');
      const dragCheckMock = vi.fn().mockReturnValue(false);

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, dragCheckMock)
      );

      act(() => {
        result.current.handleMouseDown(100, 100);
      });

      act(() => {
        result.current.processClick(102, 103); // Close to mousedown
      });

      expect(mockGetEntityAtPoint).toHaveBeenCalledWith(102, 103);
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-123']);
    });

    it('should pass correct coordinates to isDragDistance', () => {
      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-123');
      const dragCheckMock = vi.fn().mockReturnValue(false);

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, dragCheckMock)
      );

      act(() => {
        result.current.handleMouseDown(100, 150);
      });

      act(() => {
        result.current.processClick(102, 153);
      });

      expect(dragCheckMock).toHaveBeenCalledWith(100, 150, 102, 153);
    });
  });

  describe('multi-select with modifier keys', () => {
    it('should add to selection with Shift+click', () => {
      // Set initial selection
      useSelectionStore.getState().setSelected(['entity-1']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-2');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200, { shiftKey: true, ctrlKey: false });
      });

      // Should add entity-2 to selection, keeping entity-1
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1', 'entity-2']);
    });

    it('should toggle selection with Ctrl+click (add)', () => {
      // Set initial selection
      useSelectionStore.getState().setSelected(['entity-1']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-2');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200, { shiftKey: false, ctrlKey: true });
      });

      // Should toggle entity-2 on (add to selection)
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1', 'entity-2']);
    });

    it('should toggle selection with Ctrl+click (remove)', () => {
      // Set initial selection with entity-2 already selected
      useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-2');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200, { shiftKey: false, ctrlKey: true });
      });

      // Should toggle entity-2 off (remove from selection)
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);
    });

    it('should not clear selection when clicking empty space with Shift held', () => {
      useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue(null);

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200, { shiftKey: true, ctrlKey: false });
      });

      // Selection should remain unchanged
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1', 'entity-2']);
    });

    it('should not clear selection when clicking empty space with Ctrl held', () => {
      useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue(null);

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200, { shiftKey: false, ctrlKey: true });
      });

      // Selection should remain unchanged
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1', 'entity-2']);
    });

    it('should not duplicate when Shift+click same object', () => {
      // entity-1 already selected
      useSelectionStore.getState().setSelected(['entity-1']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-1');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleClick(100, 200, { shiftKey: true, ctrlKey: false });
      });

      // Should still only have one entity-1
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);
    });
  });

  describe('processClick with modifiers', () => {
    it('should pass modifiers through processClick to handleClick', () => {
      useSelectionStore.getState().setSelected(['entity-1']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-2');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleMouseDown(100, 100);
      });

      act(() => {
        result.current.processClick(102, 103, { shiftKey: true, ctrlKey: false });
      });

      // Should add to selection via Shift
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1', 'entity-2']);
    });

    it('should not select on drag even with modifiers', () => {
      useSelectionStore.getState().setSelected(['entity-1']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-2');
      const dragCheckMock = vi.fn().mockReturnValue(true);

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, dragCheckMock)
      );

      act(() => {
        result.current.handleMouseDown(100, 100);
      });

      act(() => {
        result.current.processClick(200, 200, { shiftKey: true, ctrlKey: false });
      });

      // Selection should not change because it was a drag
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);
    });

    it('should not duplicate when Shift+click same object via processClick', () => {
      // entity-1 already selected
      useSelectionStore.getState().setSelected(['entity-1']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-1');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      act(() => {
        result.current.handleMouseDown(100, 100);
      });

      act(() => {
        result.current.processClick(102, 103, { shiftKey: true, ctrlKey: false });
      });

      // Should still only have one entity-1
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);
    });
  });

  describe('modifier key priority', () => {
    it('should prioritize Shift over Ctrl when both are held', () => {
      // Start with entity-1 selected
      useSelectionStore.getState().setSelected(['entity-1']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-2');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      // Both Shift and Ctrl held - Shift should take priority (add, not toggle)
      act(() => {
        result.current.handleClick(100, 200, { shiftKey: true, ctrlKey: true });
      });

      // Should add entity-2 (Shift behavior), not toggle
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1', 'entity-2']);
    });

    it('should add to selection when both modifiers held on already-selected entity', () => {
      // entity-1 already selected
      useSelectionStore.getState().setSelected(['entity-1']);

      const mockGetEntityAtPoint = vi.fn().mockReturnValue('entity-1');

      const { result } = renderHook(() =>
        useSelectionHandler(mockGetEntityAtPoint, mockIsDragDistance)
      );

      // Both Shift and Ctrl held on same entity - Shift priority means add (no-op since already selected)
      act(() => {
        result.current.handleClick(100, 200, { shiftKey: true, ctrlKey: true });
      });

      // Should NOT toggle off (Ctrl behavior), should stay selected (Shift add behavior)
      expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);
    });
  });
});
