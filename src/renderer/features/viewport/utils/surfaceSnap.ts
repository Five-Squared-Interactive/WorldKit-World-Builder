// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * Surface Snapping Utility
 *
 * Provides raycasting-based surface snapping functionality.
 * Objects snap to the top of other objects, not just Y=0 ground.
 */

import { Raycaster, Vector3, Object3D, Mesh, Box3 } from 'three';

/** Small offset to prevent z-fighting when snapping to surfaces */
const SNAP_OFFSET = 0.001;

/** Maximum raycast distance to check for surfaces below */
const MAX_RAYCAST_DISTANCE = 1000;

/**
 * Cast a ray downward from a position and find the surface Y coordinate to snap to.
 *
 * @param position - The current position of the object being moved
 * @param meshMap - Map of entity IDs to their Three.js meshes
 * @param excludeEntityId - Entity ID to exclude from raycasting (the dragged object)
 * @returns The Y coordinate to snap to (surface hit + offset, or 0 for ground)
 */
export function snapToSurface(
  position: Vector3,
  meshMap: Map<string, Object3D>,
  excludeEntityId: string
): number {
  const raycaster = new Raycaster();
  const rayOrigin = new Vector3(position.x, position.y + MAX_RAYCAST_DISTANCE / 2, position.z);
  const rayDirection = new Vector3(0, -1, 0); // Pointing downward

  raycaster.set(rayOrigin, rayDirection);
  raycaster.far = MAX_RAYCAST_DISTANCE;

  // Collect all meshes except the excluded one
  const pickableMeshes: Object3D[] = [];
  for (const [entityId, mesh] of meshMap.entries()) {
    if (entityId !== excludeEntityId) {
      pickableMeshes.push(mesh);
    }
  }

  // Perform raycast
  const intersects = raycaster.intersectObjects(pickableMeshes, true);

  if (intersects.length > 0) {
    // Find the highest intersection point (closest to the object)
    // that is below the object's current position
    for (const intersect of intersects) {
      const hitY = intersect.point.y;
      // Return hit Y plus small offset
      return hitY + SNAP_OFFSET;
    }
  }

  // No surface hit - snap to ground (Y=0)
  return 0;
}

/**
 * Calculate the snapped Y position considering the object's bounding box.
 * This ensures the bottom of the object sits on the surface, not its center.
 *
 * @param position - The current center position of the object being moved
 * @param mesh - The mesh of the object being moved
 * @param meshMap - Map of entity IDs to their Three.js meshes
 * @param excludeEntityId - Entity ID to exclude from raycasting (the dragged object)
 * @returns The Y coordinate for the object's center so its bottom sits on the surface
 */
export function snapToSurfaceWithBounds(
  position: Vector3,
  mesh: Object3D,
  meshMap: Map<string, Object3D>,
  excludeEntityId: string
): number {
  // Calculate the object's bounding box to find its half-height
  const boundingBox = new Box3().setFromObject(mesh);
  const objectHalfHeight = (boundingBox.max.y - boundingBox.min.y) / 2;
  const objectBottomOffset = position.y - boundingBox.min.y;

  const raycaster = new Raycaster();
  // Cast from well above the current position
  const rayOrigin = new Vector3(position.x, position.y + MAX_RAYCAST_DISTANCE / 2, position.z);
  const rayDirection = new Vector3(0, -1, 0); // Pointing downward

  raycaster.set(rayOrigin, rayDirection);
  raycaster.far = MAX_RAYCAST_DISTANCE;

  // Collect all meshes except the excluded one
  const pickableMeshes: Object3D[] = [];
  for (const [entityId, mesh] of meshMap.entries()) {
    if (entityId !== excludeEntityId) {
      pickableMeshes.push(mesh);
    }
  }

  // Perform raycast
  const intersects = raycaster.intersectObjects(pickableMeshes, true);

  if (intersects.length > 0) {
    // Get the highest intersection point
    const hitY = intersects[0].point.y;
    // Return the Y position for the center so the bottom sits on the surface
    return hitY + objectBottomOffset + SNAP_OFFSET;
  }

  // No surface hit - snap to ground (Y=0)
  // Position center so bottom is at Y=0
  return objectBottomOffset + SNAP_OFFSET;
}

/**
 * Simplified surface snap that returns just the surface Y value.
 * Useful for initial object placement where we don't have a mesh yet.
 *
 * @param x - X coordinate to check
 * @param z - Z coordinate to check
 * @param meshMap - Map of entity IDs to their Three.js meshes
 * @returns The Y coordinate of the surface at (x, z) or 0 for ground
 */
export function getSurfaceYAt(
  x: number,
  z: number,
  meshMap: Map<string, Object3D>
): number {
  const raycaster = new Raycaster();
  const rayOrigin = new Vector3(x, MAX_RAYCAST_DISTANCE / 2, z);
  const rayDirection = new Vector3(0, -1, 0);

  raycaster.set(rayOrigin, rayDirection);
  raycaster.far = MAX_RAYCAST_DISTANCE;

  // Collect all meshes
  const pickableMeshes: Object3D[] = Array.from(meshMap.values());

  // Perform raycast
  const intersects = raycaster.intersectObjects(pickableMeshes, true);

  if (intersects.length > 0) {
    return intersects[0].point.y + SNAP_OFFSET;
  }

  return 0;
}
