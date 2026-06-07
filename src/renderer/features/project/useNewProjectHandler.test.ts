/**
 * New Project Handler Hook Tests
 *
 * Tests for the useNewProjectHandler hook that manages
 * new project dialog state and listens for menu events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNewProjectHandler } from './useNewProjectHandler';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';

describe('useNewProjectHandler', () => {
  const mockCleanup = vi.fn();
  const mockOnNewProject = vi.fn(() => mockCleanup);
  const mockShowUnsavedChangesDialog = vi.fn().mockResolvedValue('discard');
  let originalWorldkit: typeof window.worldkit | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    // Store original worldkit
    originalWorldkit = window.worldkit;
    // Reset project store
    useProjectStore.getState().newProject();
    // Reset UI store dialog state
    useUIStore.getState().closeNewProjectDialog();
  });

  afterEach(() => {
    // Restore original worldkit
    if (originalWorldkit !== undefined) {
      window.worldkit = originalWorldkit;
    } else {
      // @ts-expect-error - intentionally removing worldkit
      delete window.worldkit;
    }
  });

  describe('when worldkit API is available', () => {
    beforeEach(() => {
      // @ts-expect-error - mocking worldkit
      window.worldkit = {
        project: {
          onNewProject: mockOnNewProject,
          showUnsavedChangesDialog: mockShowUnsavedChangesDialog,
        },
      };
    });

    it('should register listener on mount', () => {
      renderHook(() => useNewProjectHandler());

      expect(mockOnNewProject).toHaveBeenCalledTimes(1);
      expect(mockOnNewProject).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call cleanup function on unmount', () => {
      const { unmount } = renderHook(() => useNewProjectHandler());

      unmount();

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('should return isDialogOpen as false initially', () => {
      const { result } = renderHook(() => useNewProjectHandler());

      expect(result.current.isDialogOpen).toBe(false);
    });

    it('should open dialog when openDialog is called', async () => {
      const { result } = renderHook(() => useNewProjectHandler());

      await act(async () => {
        await result.current.openDialog();
      });

      expect(result.current.isDialogOpen).toBe(true);
    });

    it('should close dialog when closeDialog is called', async () => {
      const { result } = renderHook(() => useNewProjectHandler());

      await act(async () => {
        await result.current.openDialog();
      });
      expect(result.current.isDialogOpen).toBe(true);

      act(() => {
        result.current.closeDialog();
      });

      expect(result.current.isDialogOpen).toBe(false);
    });

    it('should check unsaved changes before opening dialog', async () => {
      // Mark project as dirty
      useProjectStore.getState().markDirty();

      const { result } = renderHook(() => useNewProjectHandler());

      await act(async () => {
        await result.current.openDialog();
      });

      expect(mockShowUnsavedChangesDialog).toHaveBeenCalledTimes(1);
    });

    it('should not open dialog if user cancels unsaved changes dialog', async () => {
      mockShowUnsavedChangesDialog.mockResolvedValueOnce('cancel');
      useProjectStore.getState().markDirty();

      const { result } = renderHook(() => useNewProjectHandler());

      await act(async () => {
        await result.current.openDialog();
      });

      expect(result.current.isDialogOpen).toBe(false);
    });

    it('should open dialog if user discards unsaved changes', async () => {
      mockShowUnsavedChangesDialog.mockResolvedValueOnce('discard');
      useProjectStore.getState().markDirty();

      const { result } = renderHook(() => useNewProjectHandler());

      await act(async () => {
        await result.current.openDialog();
      });

      expect(result.current.isDialogOpen).toBe(true);
    });
  });

  describe('when worldkit API is not available', () => {
    it('should not throw when worldkit is undefined', () => {
      // @ts-expect-error - intentionally removing worldkit
      delete window.worldkit;

      expect(() => renderHook(() => useNewProjectHandler())).not.toThrow();
    });

    it('should not throw when project is undefined', () => {
      // @ts-expect-error - mocking worldkit without project
      window.worldkit = {};

      expect(() => renderHook(() => useNewProjectHandler())).not.toThrow();
    });

    it('should not throw when onNewProject is undefined', () => {
      // @ts-expect-error - mocking worldkit with partial project
      window.worldkit = {
        project: {
          showUnsavedChangesDialog: vi.fn(),
        },
      };

      expect(() => renderHook(() => useNewProjectHandler())).not.toThrow();
    });
  });
});
