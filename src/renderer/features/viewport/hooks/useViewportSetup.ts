/**
 * useViewportSetup Hook
 *
 * Initializes Three.js scene, camera, renderer, and controls.
 * Handles cleanup on unmount to prevent memory leaks.
 */

import { useEffect, useRef, RefObject } from 'react';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  Color,
  Mesh,
  Material,
  BufferGeometry,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Viewport setup result containing Three.js objects
 */
export interface ViewportSetupResult {
  scene: Scene | null;
  camera: PerspectiveCamera | null;
  renderer: WebGLRenderer | null;
  controls: OrbitControls | null;
}

/**
 * Hook to initialize and manage Three.js viewport
 *
 * @param containerRef - Reference to the container div for the canvas
 * @returns ViewportSetupResult with Three.js objects (null until initialized)
 */
export function useViewportSetup(
  containerRef: RefObject<HTMLDivElement | null>
): ViewportSetupResult {
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get initial dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Create scene
    const scene = new Scene();
    scene.background = new Color(0x1a1a1a); // Dark theme background
    sceneRef.current = scene;

    // Create camera (far plane extended for larger scenes)
    const camera = new PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Attach canvas to container
    container.appendChild(renderer.domElement);

    // Create OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 1;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2; // Prevent camera going below ground
    controlsRef.current = controls;

    // Add grid helper (100x100 units with 100 divisions = 1 unit per cell)
    const gridHelper = new GridHelper(100, 100, 0x444444, 0x333333);
    scene.add(gridHelper);

    // Add ambient light
    const ambientLight = new AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Visibility change handler for performance
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Skip rendering when page is hidden for performance
      if (!isVisibleRef.current) return;

      controls.update(); // Required for damping
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup function
    return () => {
      // Cancel animation loop
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }

      // Remove visibility listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Dispose controls
      controls.dispose();
      controlsRef.current = null;

      // Dispose scene objects (geometries and materials) to prevent memory leaks
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          if (object.geometry instanceof BufferGeometry) {
            object.geometry.dispose();
          }
          if (object.material instanceof Material) {
            object.material.dispose();
          } else if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          }
        }
      });

      // Remove canvas from container
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose renderer
      renderer.dispose();
      rendererRef.current = null;

      // Clear scene references
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [containerRef]);

  // These refs are set once during the mount effect and consumed by other hooks
  // in their own effects/callbacks — not during render. Safe to access here.
  // eslint-disable-next-line react-hooks/refs
  return { scene: sceneRef.current, camera: cameraRef.current, renderer: rendererRef.current, controls: controlsRef.current };
}
