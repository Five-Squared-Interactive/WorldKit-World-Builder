// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * Surface Snapping Utility Tests
 *
 * Tests for raycasting-based surface snapping functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Vector3, Mesh, BoxGeometry, MeshBasicMaterial, Object3D } from 'three';
import { snapToSurface, snapToSurfaceWithBounds, getSurfaceYAt } from './surfaceSnap';

describe('surfaceSnap', () => {
  let meshMap: Map<string, Object3D>;

  beforeEach(() => {
    meshMap = new Map();
  });

  /**
   * Helper to create a test mesh at a specific position
   */
  function createTestMesh(
    entityId: string,
    position: { x: number; y: number; z: number },
    size: { width: number; height: number; depth: number } = { width: 1, height: 1, depth: 1 }
  ): Mesh {
    const geometry = new BoxGeometry(size.width, size.height, size.depth);
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData.entityId = entityId;
    mesh.updateMatrixWorld(true);
    return mesh;
  }

  describe('snapToSurface', () => {
    it('should snap to ground (Y=0) when no objects below', () => {
      const position = new Vector3(0, 5, 0);
      const result = snapToSurface(position, meshMap, 'dragged-entity');

      expect(result).toBe(0);
    });

    it('should snap to top of object directly below', () => {
      // Place a cube at origin - its top face is at Y=0.5 (centered at Y=0, height=1)
      const cube = createTestMesh('cube-1', { x: 0, y: 0, z: 0 });
      meshMap.set('cube-1', cube);

      const position = new Vector3(0, 5, 0);
      const result = snapToSurface(position, meshMap, 'dragged-entity');

      // Should hit the top of the cube (Y=0.5) plus small offset
      expect(result).toBeCloseTo(0.501, 2);
    });

    it('should ignore the dragged object itself', () => {
      // Place a cube and mark it as the dragged entity
      const cube = createTestMesh('dragged-entity', { x: 0, y: 0, z: 0 });
      meshMap.set('dragged-entity', cube);

      const position = new Vector3(0, 5, 0);
      const result = snapToSurface(position, meshMap, 'dragged-entity');

      // Should snap to ground since the only object is excluded
      expect(result).toBe(0);
    });

    it('should snap to highest object when multiple objects below', () => {
      // Place two cubes stacked
      const lowerCube = createTestMesh('cube-lower', { x: 0, y: 0, z: 0 });
      const upperCube = createTestMesh('cube-upper', { x: 0, y: 2, z: 0 });
      meshMap.set('cube-lower', lowerCube);
      meshMap.set('cube-upper', upperCube);

      const position = new Vector3(0, 10, 0);
      const result = snapToSurface(position, meshMap, 'dragged-entity');

      // Should hit the top of the upper cube (Y=2.5) plus small offset
      expect(result).toBeCloseTo(2.501, 2);
    });

    it('should snap to ground when object is not above any other object', () => {
      // Place a cube at X=5
      const cube = createTestMesh('cube-1', { x: 5, y: 0, z: 0 });
      meshMap.set('cube-1', cube);

      // Raycast from X=0 (not above the cube)
      const position = new Vector3(0, 5, 0);
      const result = snapToSurface(position, meshMap, 'dragged-entity');

      expect(result).toBe(0);
    });

    it('should snap to object when position is at edge of object', () => {
      // Place a 2x1x2 cube centered at origin
      const cube = createTestMesh('cube-1', { x: 0, y: 0, z: 0 }, { width: 2, height: 1, depth: 2 });
      meshMap.set('cube-1', cube);

      // Position near the edge of the cube (within its bounds)
      const position = new Vector3(0.9, 5, 0.9);
      const result = snapToSurface(position, meshMap, 'dragged-entity');

      // Should still hit the top of the cube
      expect(result).toBeCloseTo(0.501, 2);
    });
  });

  describe('snapToSurfaceWithBounds', () => {
    it('should position object so its bottom sits on ground', () => {
      const draggedMesh = createTestMesh('dragged-entity', { x: 0, y: 5, z: 0 });
      const position = new Vector3(0, 5, 0);

      const result = snapToSurfaceWithBounds(position, draggedMesh, meshMap, 'dragged-entity');

      // For a unit cube, the center should be at 0.5 so bottom is at 0
      // Plus the small offset
      expect(result).toBeCloseTo(0.501, 2);
    });

    it('should position object so its bottom sits on top of another object', () => {
      // Place a cube for the dragged object to land on
      const baseCube = createTestMesh('base-cube', { x: 0, y: 0, z: 0 });
      meshMap.set('base-cube', baseCube);

      const draggedMesh = createTestMesh('dragged-entity', { x: 0, y: 5, z: 0 });
      const position = new Vector3(0, 5, 0);

      const result = snapToSurfaceWithBounds(position, draggedMesh, meshMap, 'dragged-entity');

      // Base cube top is at 0.5, dragged cube bottom should sit there
      // So dragged cube center should be at 0.5 + 0.5 = 1.0 (plus offset)
      expect(result).toBeCloseTo(1.001, 2);
    });

    it('should handle objects with different heights', () => {
      // Place a base cube
      const baseCube = createTestMesh('base-cube', { x: 0, y: 0, z: 0 });
      meshMap.set('base-cube', baseCube);

      // Dragged object is taller (height = 2)
      const draggedMesh = createTestMesh(
        'dragged-entity',
        { x: 0, y: 5, z: 0 },
        { width: 1, height: 2, depth: 1 }
      );
      const position = new Vector3(0, 5, 0);

      const result = snapToSurfaceWithBounds(position, draggedMesh, meshMap, 'dragged-entity');

      // Base cube top is at 0.5, dragged cube bottom should sit there
      // Dragged cube has height 2, so center should be at 0.5 + 1.0 = 1.5 (plus offset)
      expect(result).toBeCloseTo(1.501, 2);
    });
  });

  describe('getSurfaceYAt', () => {
    it('should return 0 when no objects at location', () => {
      const result = getSurfaceYAt(0, 0, meshMap);
      expect(result).toBe(0);
    });

    it('should return surface Y when object is below', () => {
      const cube = createTestMesh('cube-1', { x: 0, y: 0, z: 0 });
      meshMap.set('cube-1', cube);

      const result = getSurfaceYAt(0, 0, meshMap);

      // Top of cube is at Y=0.5
      expect(result).toBeCloseTo(0.501, 2);
    });

    it('should return 0 when querying location away from objects', () => {
      const cube = createTestMesh('cube-1', { x: 5, y: 0, z: 5 });
      meshMap.set('cube-1', cube);

      const result = getSurfaceYAt(0, 0, meshMap);
      expect(result).toBe(0);
    });

    it('should return highest surface when multiple objects at location', () => {
      const lowerCube = createTestMesh('cube-lower', { x: 0, y: 0, z: 0 });
      const upperCube = createTestMesh('cube-upper', { x: 0, y: 2, z: 0 });
      meshMap.set('cube-lower', lowerCube);
      meshMap.set('cube-upper', upperCube);

      const result = getSurfaceYAt(0, 0, meshMap);

      // Top of upper cube is at Y=2.5
      expect(result).toBeCloseTo(2.501, 2);
    });
  });
});
