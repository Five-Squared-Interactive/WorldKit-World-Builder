// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * useTransformControls Hook
 *
 * Manages Three.js TransformControls for moving, rotating, and scaling objects.
 * Integrates with selection store and command pattern for undo/redo support.
 */

import { useEffect, useRef, useCallback } from 'react';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Vector3 as ThreeVector3 } from 'three';
import type { Camera, Scene, Object3D, WebGLRenderer } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useSelectionStore } from '../../../stores/selectionStore';
import { useUIStore, ToolMode } from '../../../stores/uiStore';
import { useCommandStore } from '../../../stores/commandStore';
import { useSceneStore } from '../../../stores/sceneStore';
import { MoveEntityCommand } from '../../../commands/MoveEntityCommand';
import { RotateEntityCommand } from '../../../commands/RotateEntityCommand';
import { ScaleEntityCommand } from '../../../commands/ScaleEntityCommand';
import { snapToSurfaceWithBounds } from '../utils/surfaceSnap';
import type { Vector3, Quaternion } from '../../../types/entity';

/**
 * Options for useTransformControls hook
 */
interface UseTransformControlsOptions {
  /** Three.js camera */
  camera: Camera | null;
  /** Three.js WebGL renderer */
  renderer: WebGLRenderer | null;
  /** Three.js scene */
  scene: Scene | null;
  /** Reference to entity-to-mesh map from useSceneSync */
  meshMapRef: React.RefObject<Map<string, Object3D>>;
  /** OrbitControls instance to disable during gizmo drag */
  orbitControls: OrbitControls | null;
}

/**
 * Result of useTransformControls hook
 */
interface UseTransformControlsResult {
  /** Reference to the TransformControls instance */
  controlsRef: React.RefObject<TransformControls | null>;
}

/**
 * Hook to manage TransformControls for object manipulation
 *
 * Features:
 * - Attaches gizmo to selected objects
 * - Shows/hides based on tool mode (visible in Move, Rotate, and Scale modes)
 * - Creates MoveEntityCommand, RotateEntityCommand, or ScaleEntityCommand for undo/redo support
 * - Disables OrbitControls during gizmo drag
 *
 * @param options - Configuration options
 * @returns Reference to TransformControls
 */
export function useTransformControls({
  camera,
  renderer,
  scene,
  meshMapRef,
  orbitControls,
}: UseTransformControlsOptions): UseTransformControlsResult {
  const controlsRef = useRef<TransformControls | null>(null);
  const dragStartPositionRef = useRef<Vector3 | null>(null);
  const dragStartRotationRef = useRef<Quaternion | null>(null);
  const dragStartScaleRef = useRef<Vector3 | null>(null);
  const currentEntityIdRef = useRef<string | null>(null);
  const currentModeRef = useRef<'translate' | 'rotate' | 'scale' | null>(null);

  // Subscribe to stores
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const toolMode = useUIStore((state) => state.toolMode);
  const snappingEnabled = useUIStore((state) => state.snappingEnabled);
  const executeCommand = useCommandStore((state) => state.execute);

  // Create TransformControls instance
  useEffect(() => {
    if (!camera || !renderer || !scene) return;

    const controls = new TransformControls(camera, renderer.domElement);
    controls.setMode('translate');
    controls.setSize(0.75); // Slightly smaller gizmo
    scene.add(controls.getHelper());
    controlsRef.current = controls;

    // Initially hidden
    controls.visible = false;
    controls.enabled = false;

    return () => {
      scene.remove(controls.getHelper());
      controls.detach();
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, renderer, scene]);

  // Handle drag start/end for command creation
  const handleDraggingChanged = useCallback(
    (event: { value: boolean }) => {
      const controls = controlsRef.current;
      if (!controls || !controls.object) return;

      const mesh = controls.object;
      const entityId = mesh.userData.entityId as string | undefined;
      if (!entityId) return;

      const mode = currentModeRef.current;

      if (event.value) {
        // Drag started - capture old transform based on mode
        currentEntityIdRef.current = entityId;

        if (mode === 'translate') {
          dragStartPositionRef.current = {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          };
        } else if (mode === 'rotate') {
          dragStartRotationRef.current = {
            x: mesh.quaternion.x,
            y: mesh.quaternion.y,
            z: mesh.quaternion.z,
            w: mesh.quaternion.w,
          };
        } else if (mode === 'scale') {
          dragStartScaleRef.current = {
            x: mesh.scale.x,
            y: mesh.scale.y,
            z: mesh.scale.z,
          };
        }

        // Disable OrbitControls during gizmo drag
        if (orbitControls) {
          orbitControls.enabled = false;
        }
      } else {
        // Drag ended - create command with new transform
        const currentEntityId = currentEntityIdRef.current;

        if (mode === 'translate' && dragStartPositionRef.current && currentEntityId) {
          const oldPos = dragStartPositionRef.current;
          let newPos: Vector3 = {
            x: mesh.position.x,
            y: mesh.position.y,
            z: mesh.position.z,
          };

          // Apply surface snapping if enabled
          if (snappingEnabled && meshMapRef.current) {
            const threePos = new ThreeVector3(newPos.x, newPos.y, newPos.z);
            const snappedY = snapToSurfaceWithBounds(
              threePos,
              mesh,
              meshMapRef.current,
              currentEntityId
            );
            newPos = { ...newPos, y: snappedY };
            // Update the mesh position to reflect snap
            mesh.position.y = snappedY;
            // Update the store with snapped position
            useSceneStore.getState().updateEntityTransform(currentEntityId, {
              position: newPos,
            });
          }

          // Only create command if position actually changed
          const positionChanged =
            Math.abs(oldPos.x - newPos.x) > 0.0001 ||
            Math.abs(oldPos.y - newPos.y) > 0.0001 ||
            Math.abs(oldPos.z - newPos.z) > 0.0001;

          if (positionChanged) {
            const command = new MoveEntityCommand(currentEntityId, oldPos, newPos);
            executeCommand(command);
          }
        } else if (mode === 'rotate' && dragStartRotationRef.current && currentEntityId) {
          const oldRot = dragStartRotationRef.current;
          const newRot: Quaternion = {
            x: mesh.quaternion.x,
            y: mesh.quaternion.y,
            z: mesh.quaternion.z,
            w: mesh.quaternion.w,
          };

          // Only create command if rotation actually changed
          const rotationChanged =
            Math.abs(oldRot.x - newRot.x) > 0.0001 ||
            Math.abs(oldRot.y - newRot.y) > 0.0001 ||
            Math.abs(oldRot.z - newRot.z) > 0.0001 ||
            Math.abs(oldRot.w - newRot.w) > 0.0001;

          if (rotationChanged) {
            const command = new RotateEntityCommand(currentEntityId, oldRot, newRot);
            executeCommand(command);
          }
        } else if (mode === 'scale' && dragStartScaleRef.current && currentEntityId) {
          const oldScale = dragStartScaleRef.current;
          const newScale: Vector3 = {
            x: mesh.scale.x,
            y: mesh.scale.y,
            z: mesh.scale.z,
          };

          // Only create command if scale actually changed
          const scaleChanged =
            Math.abs(oldScale.x - newScale.x) > 0.0001 ||
            Math.abs(oldScale.y - newScale.y) > 0.0001 ||
            Math.abs(oldScale.z - newScale.z) > 0.0001;

          if (scaleChanged) {
            const command = new ScaleEntityCommand(currentEntityId, oldScale, newScale);
            executeCommand(command);
          }
        }

        dragStartPositionRef.current = null;
        dragStartRotationRef.current = null;
        dragStartScaleRef.current = null;
        currentEntityIdRef.current = null;

        // Re-enable OrbitControls
        if (orbitControls) {
          orbitControls.enabled = true;
        }
      }
    },
    [executeCommand, orbitControls, snappingEnabled, meshMapRef]
  );

  // Handle real-time transform updates during drag
  const handleObjectChange = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls || !controls.object) return;

    const mesh = controls.object;
    const entityId = mesh.userData.entityId as string | undefined;
    if (!entityId) return;

    const mode = currentModeRef.current;

    // Update store during drag for real-time visual feedback
    // This is a direct update, not via command (command created on drag end)
    if (mode === 'translate') {
      useSceneStore.getState().updateEntityTransform(entityId, {
        position: {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
        },
      });
    } else if (mode === 'rotate') {
      useSceneStore.getState().updateEntityTransform(entityId, {
        rotation: {
          x: mesh.quaternion.x,
          y: mesh.quaternion.y,
          z: mesh.quaternion.z,
          w: mesh.quaternion.w,
        },
      });
    } else if (mode === 'scale') {
      useSceneStore.getState().updateEntityTransform(entityId, {
        scale: {
          x: mesh.scale.x,
          y: mesh.scale.y,
          z: mesh.scale.z,
        },
      });
    }
  }, []);

  // Attach event listeners
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.addEventListener('dragging-changed', handleDraggingChanged);
    controls.addEventListener('objectChange', handleObjectChange);

    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
      controls.removeEventListener('objectChange', handleObjectChange);
    };
  }, [handleDraggingChanged, handleObjectChange]);

  // Attach/detach gizmo based on selection and tool mode
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !meshMapRef.current) return;

    const firstSelectedId = selectedIds[0];
    const isInMoveMode = toolMode === ToolMode.Move;
    const isInRotateMode = toolMode === ToolMode.Rotate;
    const isInScaleMode = toolMode === ToolMode.Scale;
    const shouldShowGizmo = isInMoveMode || isInRotateMode || isInScaleMode;

    if (firstSelectedId && shouldShowGizmo) {
      const mesh = meshMapRef.current.get(firstSelectedId);
      if (mesh) {
        // Set the appropriate mode for TransformControls
        if (isInMoveMode) {
          controls.setMode('translate');
          currentModeRef.current = 'translate';
        } else if (isInRotateMode) {
          controls.setMode('rotate');
          currentModeRef.current = 'rotate';
        } else if (isInScaleMode) {
          controls.setMode('scale');
          currentModeRef.current = 'scale';
        }

        controls.attach(mesh);
        controls.visible = true;
        controls.enabled = true;
      } else {
        // Mesh not found, hide gizmo
        controls.detach();
        controls.visible = false;
        controls.enabled = false;
        currentModeRef.current = null;
      }
    } else {
      // No selection or not in a transform mode
      controls.detach();
      controls.visible = false;
      controls.enabled = false;
      currentModeRef.current = null;
    }
  }, [selectedIds, toolMode, meshMapRef]);

  return { controlsRef };
}
