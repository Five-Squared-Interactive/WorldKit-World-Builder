/**
 * useSceneSync Hook
 *
 * Synchronizes the sceneStore entities with Three.js scene.
 * Creates and removes meshes as entities are added/removed from the store.
 * Updates mesh transforms when entity transforms change in the store.
 * Supports both synchronous primitive meshes and async GLTF model loading.
 * Properly parents meshes to reflect entity hierarchy (children move with parents).
 */

import { useEffect, useRef, useCallback } from 'react';
import { Scene, Mesh, Object3D, Quaternion, Euler, MeshStandardMaterial, Color, Group } from 'three';
import { useSceneStore } from '../../../stores/sceneStore';
import { createThreeMesh, disposeThreeMesh } from '../createThreeMesh';
import { loadGltfForEntity } from '../loadGltfModel';
import { EntityType, Entity, DEFAULT_PRIMITIVE_COLOR } from '../../../types/entity';

/**
 * Dispose of a Three.js object and its children
 */
function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      disposeThreeMesh(child);
    }
  });
}

/**
 * Check if two values are approximately equal
 */
function approxEqual(a: number, b: number, epsilon = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Check if entity type is a primitive mesh (supports color)
 */
function isPrimitiveMesh(type: EntityType): boolean {
  return (
    type === EntityType.CubeMesh ||
    type === EntityType.SphereMesh ||
    type === EntityType.PlaneMesh ||
    type === EntityType.CylinderMesh
  );
}

/**
 * Sync a container's transform to match an entity
 * For containers, we apply transform directly (no plane special case needed)
 */
function syncContainerTransform(container: Object3D, entity: Entity): void {
  // Only update position if it changed
  const pos = entity.transform.position;
  if (
    !approxEqual(container.position.x, pos.x) ||
    !approxEqual(container.position.y, pos.y) ||
    !approxEqual(container.position.z, pos.z)
  ) {
    container.position.set(pos.x, pos.y, pos.z);
  }

  // Update rotation
  const rot = entity.transform.rotation;
  if (
    !approxEqual(container.quaternion.x, rot.x) ||
    !approxEqual(container.quaternion.y, rot.y) ||
    !approxEqual(container.quaternion.z, rot.z) ||
    !approxEqual(container.quaternion.w, rot.w)
  ) {
    container.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  }

  // Only update scale if it changed
  const scale = entity.transform.scale;
  if (
    !approxEqual(container.scale.x, scale.x) ||
    !approxEqual(container.scale.y, scale.y) ||
    !approxEqual(container.scale.z, scale.z)
  ) {
    container.scale.set(scale.x, scale.y, scale.z);
  }

  // Sync color for primitive meshes (find the mesh inside the container)
  if (isPrimitiveMesh(entity.type)) {
    container.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
        const targetColor = new Color(entity.color ?? DEFAULT_PRIMITIVE_COLOR);
        if (!child.material.color.equals(targetColor)) {
          child.material.color.copy(targetColor);
        }
      }
    });
  }
}

/**
 * Hook to sync sceneStore entities with Three.js scene
 *
 * @param scene - The Three.js scene to sync with
 * @returns Reference to the entity-to-mesh map for external use
 */
export function useSceneSync(scene: Scene | null): React.MutableRefObject<Map<string, Object3D>> {
  const meshMapRef = useRef<Map<string, Object3D>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());
  const entities = useSceneStore((state) => state.entities);

  /**
   * Get the correct parent for a mesh based on entity hierarchy
   */
  const getParentObject = useCallback(
    (entity: Entity): Object3D | null => {
      if (!entity.parentId) {
        return scene;
      }
      // Look for parent's container group
      const parentContainer = meshMapRef.current.get(entity.parentId);
      if (parentContainer) {
        // Find or create the children group within the parent container
        let childrenGroup = parentContainer.children.find(
          (child) => child.userData.isChildrenGroup
        ) as Group | undefined;
        if (!childrenGroup) {
          childrenGroup = new Group();
          childrenGroup.userData.isChildrenGroup = true;
          parentContainer.add(childrenGroup);
        }
        return childrenGroup;
      }
      return null; // Parent not yet created
    },
    [scene]
  );

  /**
   * Wrap a mesh in a container group for proper hierarchy support
   */
  const createMeshContainer = useCallback((mesh: Object3D, entity: Entity): Group => {
    const container = new Group();
    container.userData.entityId = entity.id;

    // Apply transform to container
    container.position.set(
      entity.transform.position.x,
      entity.transform.position.y,
      entity.transform.position.z
    );
    container.quaternion.set(
      entity.transform.rotation.x,
      entity.transform.rotation.y,
      entity.transform.rotation.z,
      entity.transform.rotation.w
    );
    container.scale.set(
      entity.transform.scale.x,
      entity.transform.scale.y,
      entity.transform.scale.z
    );

    // Reset mesh local transform (it's now on the container)
    mesh.position.set(0, 0, 0);
    mesh.quaternion.set(0, 0, 0, 1);
    mesh.scale.set(1, 1, 1);

    // Special handling for planes - keep the horizontal rotation on the mesh
    if (entity.type === EntityType.PlaneMesh) {
      mesh.rotation.x = -Math.PI / 2;
    }

    container.add(mesh);
    return container;
  }, []);

  /**
   * Sort entities so parents come before children
   */
  const sortEntitiesByHierarchy = useCallback((entityList: Entity[]): Entity[] => {
    const sorted: Entity[] = [];
    const added = new Set<string>();

    const addWithDependencies = (entity: Entity) => {
      if (added.has(entity.id)) return;

      // First add parent if exists
      if (entity.parentId) {
        const parent = entities[entity.parentId];
        if (parent && !added.has(parent.id)) {
          addWithDependencies(parent);
        }
      }

      sorted.push(entity);
      added.add(entity.id);
    };

    for (const entity of entityList) {
      addWithDependencies(entity);
    }

    return sorted;
  }, [entities]);

  /**
   * Async loader for GLTF entities
   */
  const loadGltfEntity = useCallback(
    async (entity: Entity, parentObject: Object3D) => {
      if (!scene || loadingRef.current.has(entity.id)) return;

      loadingRef.current.add(entity.id);

      try {
        const result = await loadGltfForEntity(entity);

        // Check if entity still exists and scene is still valid
        const currentEntities = useSceneStore.getState().entities;
        if (!currentEntities[entity.id] || !scene) {
          loadingRef.current.delete(entity.id);
          return;
        }

        if (result.success && result.object) {
          // Wrap the GLTF object in a container
          const container = createMeshContainer(result.object, entity);
          parentObject.add(container);
          meshMapRef.current.set(entity.id, container);
        } else {
          console.error(`Failed to load GLTF model for entity ${entity.id}:`, result.error);
        }
      } catch (err) {
        console.error(`Error loading GLTF model for entity ${entity.id}:`, err);
      } finally {
        loadingRef.current.delete(entity.id);
      }
    },
    [scene, createMeshContainer]
  );

  useEffect(() => {
    if (!scene) return;

    const currentIds = new Set(Object.keys(entities));
    const existingIds = new Set(meshMapRef.current.keys());

    // Sort entities so parents are processed before children
    const sortedEntities = sortEntitiesByHierarchy(Object.values(entities));

    // Add new meshes for entities that don't have meshes yet
    // and update transforms for existing meshes
    for (const entity of sortedEntities) {
      const id = entity.id;
      const existingContainer = meshMapRef.current.get(id);

      if (existingContainer) {
        // Check if the container needs to be re-parented
        const correctParent = getParentObject(entity);
        const currentParent = existingContainer.parent;

        if (correctParent && currentParent !== correctParent) {
          // Re-parent the container to match the entity hierarchy
          if (currentParent) {
            currentParent.remove(existingContainer);
          }
          correctParent.add(existingContainer);
        }

        // Sync transform for existing container (handles undo/redo and external changes)
        syncContainerTransform(existingContainer, entity);
      } else if (!loadingRef.current.has(id)) {
        const parentObject = getParentObject(entity);

        if (!parentObject) {
          // Parent not ready yet, skip for now (will be added on next render)
          continue;
        }

        if (entity.type === EntityType.GltfMesh) {
          // Load GLTF models asynchronously
          loadGltfEntity(entity, parentObject);
        } else {
          // Create primitive meshes synchronously
          const mesh = createThreeMesh(entity);
          if (mesh) {
            // Wrap in container for proper hierarchy
            const container = createMeshContainer(mesh, entity);
            parentObject.add(container);
            meshMapRef.current.set(id, container);
          }
        }
      }
    }

    // Remove meshes for entities that no longer exist
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const object = meshMapRef.current.get(id);
        if (object && object.parent) {
          object.parent.remove(object);
          disposeObject(object);
          meshMapRef.current.delete(id);
        }
      }
    }
  }, [scene, entities, loadGltfEntity, getParentObject, createMeshContainer, sortEntitiesByHierarchy]);

  // Cleanup all meshes when component unmounts
  useEffect(() => {
    return () => {
      if (scene) {
        for (const [, object] of meshMapRef.current) {
          if (object.parent) {
            object.parent.remove(object);
          }
          disposeObject(object);
        }
        meshMapRef.current.clear();
      }
    };
  }, [scene]);

  return meshMapRef;
}
