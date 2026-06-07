/**
 * useObjectPicking Hook
 *
 * Provides Three.js raycaster-based object picking functionality
 * for selecting entities in the 3D viewport.
 */

import { useRef, useCallback } from 'react';
import { Raycaster, Vector2, Scene, Camera } from 'three';

/** Default drag threshold in pixels */
const DRAG_THRESHOLD = 5;

/**
 * Hook for object picking using Three.js Raycaster
 *
 * @param scene - The Three.js scene to raycast against
 * @param camera - The camera to use for raycasting
 * @param containerRef - Ref to the container element for coordinate calculation
 * @returns Object with picking utilities
 */
export function useObjectPicking(
  scene: Scene | null,
  camera: Camera | null,
  containerRef: React.RefObject<HTMLElement | null>
) {
  const raycasterRef = useRef(new Raycaster());
  const mouseRef = useRef(new Vector2());

  /**
   * Get the entity ID at a screen position
   *
   * @param clientX - Mouse X position (from event.clientX)
   * @param clientY - Mouse Y position (from event.clientY)
   * @returns Entity ID if an object is hit, null otherwise
   */
  const getEntityAtPoint = useCallback(
    (clientX: number, clientY: number): string | null => {
      if (!scene || !camera || !containerRef.current) {
        return null;
      }

      const rect = containerRef.current.getBoundingClientRect();

      // Convert to normalized device coordinates (-1 to +1)
      mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      // Set up raycaster from camera through mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Filter scene children to only include meshes with entityId
      const pickableObjects = scene.children.filter(
        (obj) => obj.type === 'Mesh' && obj.userData.entityId
      );

      // Perform raycast (recursive: false - only check direct objects)
      const intersects = raycasterRef.current.intersectObjects(
        pickableObjects,
        false
      );

      // Return the entityId of the closest intersected object
      if (intersects.length > 0) {
        return intersects[0].object.userData.entityId as string;
      }

      return null;
    },
    [scene, camera, containerRef]
  );

  /**
   * Check if the distance between two points exceeds the drag threshold
   *
   * @param startX - Starting X position
   * @param startY - Starting Y position
   * @param endX - Ending X position
   * @param endY - Ending Y position
   * @returns True if the distance exceeds the drag threshold
   */
  const isDragDistance = useCallback(
    (startX: number, startY: number, endX: number, endY: number): boolean => {
      const dx = Math.abs(endX - startX);
      const dy = Math.abs(endY - startY);
      return dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD;
    },
    []
  );

  return {
    getEntityAtPoint,
    isDragDistance,
  };
}
