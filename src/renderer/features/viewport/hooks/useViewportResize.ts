/**
 * useViewportResize Hook
 *
 * Handles viewport resizing using ResizeObserver.
 * Updates camera aspect ratio and renderer size when container dimensions change.
 */

import { useEffect, useCallback, RefObject } from 'react';
import { PerspectiveCamera, WebGLRenderer } from 'three';

/**
 * Resize callback type
 */
export type ResizeCallback = (width: number, height: number) => void;

/**
 * Hook to handle viewport resizing
 *
 * @param containerRef - Reference to the container element
 * @param camera - Three.js PerspectiveCamera to update aspect ratio
 * @param renderer - Three.js WebGLRenderer to update size
 * @param onResize - Optional callback when resize occurs
 */
export function useViewportResize(
  containerRef: RefObject<HTMLDivElement | null>,
  camera: PerspectiveCamera | null,
  renderer: WebGLRenderer | null,
  onResize?: ResizeCallback
): void {
  const handleResize = useCallback(
    (entries: ResizeObserverEntry[]) => {
      if (!camera || !renderer) return;

      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      // Prevent division by zero
      if (width === 0 || height === 0) return;

      // Update camera aspect ratio
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      // Update renderer size
      renderer.setSize(width, height);

      // Call optional callback
      if (onResize) {
        onResize(width, height);
      }
    },
    [camera, renderer, onResize]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !camera || !renderer) return;

    // Create ResizeObserver
    const resizeObserver = new ResizeObserver(handleResize);

    // Observe the container
    resizeObserver.observe(container);

    // Initial size sync (in case container already has size)
    const { clientWidth, clientHeight } = container;
    if (clientWidth > 0 && clientHeight > 0) {
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, camera, renderer, handleResize]);
}
