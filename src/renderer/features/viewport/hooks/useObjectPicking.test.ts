/**
 * useObjectPicking Hook Tests
 *
 * Tests for the Three.js raycaster-based object picking hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useObjectPicking } from './useObjectPicking';
import { Scene, PerspectiveCamera, Mesh, Raycaster, Vector2 } from 'three';

// Mock Three.js Raycaster using hoisted mocks and class syntax
const mocks = vi.hoisted(() => ({
  setFromCamera: vi.fn(),
  intersectObjects: vi.fn(),
}));

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');

  // Use class syntax for proper constructor support
  class MockRaycaster {
    setFromCamera = mocks.setFromCamera;
    intersectObjects = mocks.intersectObjects;
  }

  return {
    ...actual,
    Raycaster: MockRaycaster,
  };
});

// Alias for readability
const mockSetFromCamera = mocks.setFromCamera;
const mockIntersectObjects = mocks.intersectObjects;

describe('useObjectPicking', () => {
  let mockScene: Scene;
  let mockCamera: PerspectiveCamera;
  let mockContainer: HTMLDivElement;
  let containerRef: { current: HTMLDivElement | null };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock scene with children
    mockScene = new Scene();
    mockCamera = new PerspectiveCamera();

    // Create mock container element
    mockContainer = document.createElement('div');
    Object.defineProperty(mockContainer, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }),
    });

    containerRef = { current: mockContainer };

    // Reset mocks
    mockIntersectObjects.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getEntityAtPoint', () => {
    it('should return null when scene is null', () => {
      const { result } = renderHook(() =>
        useObjectPicking(null, mockCamera, containerRef)
      );

      const entityId = result.current.getEntityAtPoint(100, 100);
      expect(entityId).toBeNull();
    });

    it('should return null when camera is null', () => {
      const { result } = renderHook(() =>
        useObjectPicking(mockScene, null, containerRef)
      );

      const entityId = result.current.getEntityAtPoint(100, 100);
      expect(entityId).toBeNull();
    });

    it('should return null when container is null', () => {
      const nullRef = { current: null };
      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, nullRef)
      );

      const entityId = result.current.getEntityAtPoint(100, 100);
      expect(entityId).toBeNull();
    });

    it('should compute normalized device coordinates from mouse position', () => {
      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      // Click at center of 800x600 container
      result.current.getEntityAtPoint(400, 300);

      expect(mockSetFromCamera).toHaveBeenCalledTimes(1);
      // At center: x = (400/800)*2 - 1 = 0, y = -(300/600)*2 + 1 = 0
      const calledVector = mockSetFromCamera.mock.calls[0][0];
      expect(calledVector.x).toBeCloseTo(0);
      expect(calledVector.y).toBeCloseTo(0);
    });

    it('should compute correct NDC for top-left corner', () => {
      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      result.current.getEntityAtPoint(0, 0);

      const calledVector = mockSetFromCamera.mock.calls[0][0];
      // At top-left: x = (0/800)*2 - 1 = -1, y = -(0/600)*2 + 1 = 1
      expect(calledVector.x).toBeCloseTo(-1);
      expect(calledVector.y).toBeCloseTo(1);
    });

    it('should compute correct NDC for bottom-right corner', () => {
      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      result.current.getEntityAtPoint(800, 600);

      const calledVector = mockSetFromCamera.mock.calls[0][0];
      // At bottom-right: x = (800/800)*2 - 1 = 1, y = -(600/600)*2 + 1 = -1
      expect(calledVector.x).toBeCloseTo(1);
      expect(calledVector.y).toBeCloseTo(-1);
    });

    it('should return null when no objects intersected', () => {
      mockIntersectObjects.mockReturnValue([]);

      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      const entityId = result.current.getEntityAtPoint(400, 300);
      expect(entityId).toBeNull();
    });

    it('should return entityId when object is intersected', () => {
      const mockMesh = {
        type: 'Mesh',
        userData: { entityId: 'entity-123' },
      };

      mockIntersectObjects.mockReturnValue([
        { object: mockMesh, distance: 10 },
      ]);

      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      const entityId = result.current.getEntityAtPoint(400, 300);
      expect(entityId).toBe('entity-123');
    });

    it('should return closest object entityId when multiple objects intersected', () => {
      const mockMesh1 = {
        type: 'Mesh',
        userData: { entityId: 'entity-far' },
      };
      const mockMesh2 = {
        type: 'Mesh',
        userData: { entityId: 'entity-close' },
      };

      // Raycaster returns intersections sorted by distance (closest first)
      mockIntersectObjects.mockReturnValue([
        { object: mockMesh2, distance: 5 },
        { object: mockMesh1, distance: 15 },
      ]);

      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      const entityId = result.current.getEntityAtPoint(400, 300);
      expect(entityId).toBe('entity-close');
    });

    it('should only raycast against meshes with entityId', () => {
      // Add mock children to scene
      const meshWithEntity = { type: 'Mesh', userData: { entityId: 'entity-1' } };
      const meshWithoutEntity = { type: 'Mesh', userData: {} };
      const gridHelper = { type: 'GridHelper', userData: {} };

      mockScene.children = [meshWithEntity, meshWithoutEntity, gridHelper] as any;

      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      result.current.getEntityAtPoint(400, 300);

      // Should filter to only meshes with entityId
      expect(mockIntersectObjects).toHaveBeenCalledWith(
        expect.arrayContaining([meshWithEntity]),
        false
      );
      expect(mockIntersectObjects.mock.calls[0][0]).toHaveLength(1);
    });
  });

  describe('isDragDistance', () => {
    it('should return false when distance is within threshold', () => {
      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      expect(result.current.isDragDistance(100, 100, 102, 103)).toBe(false);
    });

    it('should return true when distance exceeds threshold', () => {
      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      expect(result.current.isDragDistance(100, 100, 110, 110)).toBe(true);
    });

    it('should use default threshold of 5 pixels', () => {
      const { result } = renderHook(() =>
        useObjectPicking(mockScene, mockCamera, containerRef)
      );

      // Just under threshold
      expect(result.current.isDragDistance(0, 0, 4, 0)).toBe(false);
      // At threshold
      expect(result.current.isDragDistance(0, 0, 5, 0)).toBe(false);
      // Over threshold
      expect(result.current.isDragDistance(0, 0, 6, 0)).toBe(true);
    });
  });
});
