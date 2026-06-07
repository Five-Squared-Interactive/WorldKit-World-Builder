/**
 * Viewport Component
 *
 * 3D viewport for scene editing using Three.js.
 * Renders a WebGL canvas with grid, lighting, and orbit controls.
 */

import { useRef, useCallback, useState } from 'react';
import {
  useViewportSetup,
  useViewportResize,
  useSceneSync,
  useObjectPicking,
  useSelectionHandler,
  useSelectionOutline,
  useTransformControls,
} from './hooks';
import { useSceneStore, useUIStore, useCommandStore } from '../../stores';
import { createPrimitiveEntity, createGltfEntity, instantiatePrefab } from '../primitives/createPrimitive';
import { AddEntityCommand } from '../../commands/AddEntityCommand';
import { getSurfaceYAt } from './utils/surfaceSnap';
import type { Asset } from '../../types/asset';

/**
 * Check if a file has a supported 3D model extension
 */
function isModelFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'glb' || ext === 'gltf';
}

/**
 * 3D viewport component
 *
 * Provides an interactive Three.js scene with:
 * - Grid floor for spatial reference
 * - Ambient and directional lighting
 * - OrbitControls for camera navigation (orbit, pan, zoom)
 * - Automatic resize handling
 * - Click-to-select objects with visual feedback
 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { scene, camera, renderer, controls: orbitControls } = useViewportSetup(containerRef);

  // Store access
  const entities = useSceneStore((state) => state.entities);
  const snappingEnabled = useUIStore((state) => state.snappingEnabled);
  const executeCommand = useCommandStore((state) => state.execute);

  // Handle viewport resizing
  useViewportResize(containerRef, camera, renderer);

  // Sync sceneStore entities with Three.js scene
  const meshMapRef = useSceneSync(scene);

  // Object picking (raycasting)
  const { getEntityAtPoint, isDragDistance } = useObjectPicking(scene, camera, containerRef);

  // Selection handler (store integration with drag detection)
  const { handleMouseDown, processClick } = useSelectionHandler(getEntityAtPoint, isDragDistance);

  // Visual selection feedback (emissive highlight)
  useSelectionOutline(meshMapRef);

  // Transform gizmo for move/rotate/scale (Story 2-6)
  useTransformControls({
    camera,
    renderer,
    scene,
    meshMapRef,
    orbitControls,
  });

  // Mouse event handlers (left-click only for selection)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only handle left-click
      handleMouseDown(e.clientX, e.clientY);
    },
    [handleMouseDown]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only handle left-click
      processClick(e.clientX, e.clientY, {
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey || e.metaKey, // metaKey for Mac Cmd
      });
    },
    [processClick]
  );

  // Drag and drop handlers for asset library
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const existingNames = Object.values(entities).map((ent) => ent.name);

      // Check for dropped files (GLB/GLTF)
      if (e.dataTransfer.files.length > 0) {
        for (const file of Array.from(e.dataTransfer.files)) {
          if (isModelFile(file.name)) {
            // For Electron, we can get the file path from the file object
            const filePath = (file as unknown as { path?: string }).path;

            if (filePath) {
              const entity = createGltfEntity(filePath, existingNames);

              // Apply surface snapping if enabled
              if (snappingEnabled && meshMapRef.current) {
                const surfaceY = getSurfaceYAt(
                  entity.transform.position.x,
                  entity.transform.position.z,
                  meshMapRef.current
                );
                entity.transform.position.y = surfaceY;
              }

              // Create and execute command
              const command = new AddEntityCommand(entity);
              executeCommand(command);
            } else {
              console.error('File path not available - this feature requires Electron');
            }
          }
        }
        return;
      }

      // Check for asset library drag data
      const assetData = e.dataTransfer.getData('application/worldkit-asset');
      if (!assetData) return;

      try {
        const asset: Asset = JSON.parse(assetData);

        // Handle primitive assets
        if (asset.primitiveType) {
          const entity = createPrimitiveEntity(asset.primitiveType, existingNames);

          // Apply surface snapping if enabled
          if (snappingEnabled && meshMapRef.current) {
            const surfaceY = getSurfaceYAt(
              entity.transform.position.x,
              entity.transform.position.z,
              meshMapRef.current
            );
            entity.transform.position.y = surfaceY;
          }

          // Create and execute command
          const command = new AddEntityCommand(entity);
          executeCommand(command);
        } else if (asset.prefabData) {
          // Handle prefab assets - instantiate all entities
          const newEntities = instantiatePrefab(
            asset.prefabData.entities,
            asset.prefabData.rootId,
            existingNames
          );

          // Add all entities (root first, then children in order)
          for (const entity of newEntities) {
            // Apply surface snapping to root entity only
            if (entity.parentId === null && snappingEnabled && meshMapRef.current) {
              const surfaceY = getSurfaceYAt(
                entity.transform.position.x,
                entity.transform.position.z,
                meshMapRef.current
              );
              entity.transform.position.y = surfaceY;
            }

            const command = new AddEntityCommand(entity);
            executeCommand(command);
          }

          console.log('[Prefab] Instantiated prefab:', asset.name, 'with', newEntities.length, 'entities');
        } else if (asset.filePath) {
          // Handle GLTF assets from the library
          const entity = createGltfEntity(asset.filePath, existingNames);

          // Apply surface snapping if enabled
          if (snappingEnabled && meshMapRef.current) {
            const surfaceY = getSurfaceYAt(
              entity.transform.position.x,
              entity.transform.position.z,
              meshMapRef.current
            );
            entity.transform.position.y = surfaceY;
          }

          // Create and execute command
          const command = new AddEntityCommand(entity);
          executeCommand(command);
        }
      } catch (err) {
        console.error('Failed to parse dropped asset:', err);
      }
    },
    [entities, snappingEnabled, executeCommand, meshMapRef]
  );

  return (
    <div className="viewport" data-testid="viewport">
      <div
        ref={containerRef}
        className={`viewport-canvas ${isDragOver ? 'drag-over' : ''}`}
        data-testid="viewport-canvas"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
    </div>
  );
}

export default Viewport;
