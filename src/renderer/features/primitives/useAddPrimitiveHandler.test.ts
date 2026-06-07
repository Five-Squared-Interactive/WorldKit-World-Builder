/**
 * useAddPrimitiveHandler Hook Tests
 *
 * Tests for the hook that listens for add-primitive events from the main process.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAddPrimitiveHandler } from './useAddPrimitiveHandler';

describe('useAddPrimitiveHandler', () => {
  const mockCleanup = vi.fn();
  const mockOnAddPrimitive = vi.fn(() => mockCleanup);
  let originalWorldkit: typeof window.worldkit | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    // Store original worldkit
    originalWorldkit = window.worldkit;
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
        scene: {
          onAddPrimitive: mockOnAddPrimitive,
        },
      };
    });

    it('should register listener on mount', () => {
      renderHook(() => useAddPrimitiveHandler());

      expect(mockOnAddPrimitive).toHaveBeenCalledTimes(1);
      expect(mockOnAddPrimitive).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call cleanup function on unmount', () => {
      const { unmount } = renderHook(() => useAddPrimitiveHandler());

      unmount();

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('when worldkit API is not available', () => {
    it('should not throw when worldkit is undefined', () => {
      // @ts-expect-error - intentionally removing worldkit
      delete window.worldkit;

      expect(() => renderHook(() => useAddPrimitiveHandler())).not.toThrow();
    });

    it('should not throw when scene is undefined', () => {
      // @ts-expect-error - mocking worldkit without scene
      window.worldkit = {};

      expect(() => renderHook(() => useAddPrimitiveHandler())).not.toThrow();
    });

    it('should not throw when onAddPrimitive is undefined', () => {
      // @ts-expect-error - mocking worldkit with partial scene
      window.worldkit = {
        scene: {},
      };

      expect(() => renderHook(() => useAddPrimitiveHandler())).not.toThrow();
    });
  });
});
