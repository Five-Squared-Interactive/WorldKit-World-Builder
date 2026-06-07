/**
 * Scene Store
 *
 * Zustand store for managing the scene graph.
 * Uses normalized entity map for O(1) lookups and efficient updates.
 */

import { create } from 'zustand';
import type { Entity, Transform } from '../types/entity';

/**
 * Scene store state interface
 */
export interface SceneState {
  /** Normalized entity map: id -> Entity */
  entities: Record<string, Entity>;

  /** IDs of root-level entities (no parent) */
  rootIds: string[];
}

/**
 * Scene store actions interface
 */
export interface SceneActions {
  /**
   * Add an entity to the scene
   * @param entity - The entity to add
   * @param parentId - Optional parent entity ID
   */
  addEntity: (entity: Entity, parentId?: string) => void;

  /**
   * Remove an entity and its children from the scene
   * @param id - The entity ID to remove
   */
  removeEntity: (id: string) => void;

  /**
   * Update an entity's properties
   * @param id - The entity ID to update
   * @param updates - Partial entity updates
   */
  updateEntity: (id: string, updates: Partial<Entity>) => void;

  /**
   * Update an entity's transform (position, rotation, scale)
   * More efficient than updateEntity for transform-only updates
   * @param id - The entity ID to update
   * @param transform - Partial transform updates
   */
  updateEntityTransform: (id: string, transform: Partial<Transform>) => void;

  /**
   * Clear all entities from the scene
   */
  clearScene: () => void;

  /**
   * Get an entity by ID
   * @param id - The entity ID
   */
  getEntity: (id: string) => Entity | undefined;

  /**
   * Get all root-level entities
   */
  getRootEntities: () => Entity[];

  /**
   * Get children of an entity
   * @param parentId - The parent entity ID
   */
  getChildren: (parentId: string) => Entity[];

  /**
   * Reorder an entity within its parent's children or root level
   * @param id - The entity ID to reorder
   * @param newIndex - The new index position
   */
  reorderEntity: (id: string, newIndex: number) => void;

  /**
   * Move an entity to a new parent
   * @param id - The entity ID to move
   * @param newParentId - The new parent ID (null for root level)
   * @param index - Optional index position in new parent's children
   */
  moveToParent: (id: string, newParentId: string | null, index?: number) => void;
}

/**
 * Combined scene store type
 */
export type SceneStore = SceneState & SceneActions;

/**
 * Initial state for the scene store
 */
const initialState: SceneState = {
  entities: {},
  rootIds: [],
};

/**
 * Scene store instance
 */
export const useSceneStore = create<SceneStore>((set, get) => ({
  // State
  ...initialState,

  // Actions
  addEntity: (entity, parentId) =>
    set((state) => {
      // Validate parent exists if parentId is provided
      if (parentId && !state.entities[parentId]) {
        console.warn(
          `addEntity: Parent "${parentId}" not found. Adding "${entity.id}" as root entity.`
        );
        parentId = undefined; // Fall back to root
      }

      // Create new entity with parent reference
      const newEntity: Entity = {
        ...entity,
        parentId: parentId ?? null,
      };

      // Update entities map
      const newEntities = {
        ...state.entities,
        [entity.id]: newEntity,
      };

      // Update rootIds or parent's childIds
      let newRootIds = state.rootIds;

      if (parentId) {
        // Add to parent's children (parent guaranteed to exist after validation)
        const parent = state.entities[parentId];
        newEntities[parentId] = {
          ...parent,
          childIds: [...parent.childIds, entity.id],
        };
      } else {
        // Add to root
        newRootIds = [...state.rootIds, entity.id];
      }

      return {
        entities: newEntities,
        rootIds: newRootIds,
      };
    }),

  removeEntity: (id) =>
    set((state) => {
      const entity = state.entities[id];
      if (!entity) return state;

      // Collect all IDs to remove (entity + descendants)
      const idsToRemove = new Set<string>();

      const collectDescendants = (entityId: string) => {
        idsToRemove.add(entityId);
        const ent = state.entities[entityId];
        if (ent) {
          ent.childIds.forEach(collectDescendants);
        }
      };

      collectDescendants(id);

      // Remove from entities map
      const newEntities = { ...state.entities };
      idsToRemove.forEach((removeId) => {
        delete newEntities[removeId];
      });

      // Update parent's childIds or rootIds
      let newRootIds = state.rootIds;

      if (entity.parentId) {
        const parent = newEntities[entity.parentId];
        if (parent) {
          newEntities[entity.parentId] = {
            ...parent,
            childIds: parent.childIds.filter((childId) => childId !== id),
          };
        }
      } else {
        newRootIds = state.rootIds.filter((rootId) => rootId !== id);
      }

      return {
        entities: newEntities,
        rootIds: newRootIds,
      };
    }),

  updateEntity: (id, updates) =>
    set((state) => {
      const entity = state.entities[id];
      if (!entity) return state;

      return {
        entities: {
          ...state.entities,
          [id]: {
            ...entity,
            ...updates,
            // Prevent overwriting id
            id: entity.id,
          },
        },
      };
    }),

  updateEntityTransform: (id, transformUpdates) =>
    set((state) => {
      const entity = state.entities[id];
      if (!entity) return state;

      return {
        entities: {
          ...state.entities,
          [id]: {
            ...entity,
            transform: {
              ...entity.transform,
              ...transformUpdates,
            },
          },
        },
      };
    }),

  clearScene: () => set(initialState),

  // Selectors (use get() for current state)
  getEntity: (id) => get().entities[id],

  getRootEntities: () => {
    const state = get();
    return state.rootIds
      .map((id) => state.entities[id])
      .filter((entity): entity is Entity => entity !== undefined);
  },

  getChildren: (parentId) => {
    const state = get();
    const parent = state.entities[parentId];
    if (!parent) return [];

    return parent.childIds
      .map((id) => state.entities[id])
      .filter((entity): entity is Entity => entity !== undefined);
  },

  reorderEntity: (id, newIndex) =>
    set((state) => {
      const entity = state.entities[id];
      if (!entity) return state;

      if (entity.parentId) {
        // Entity is a child of another entity
        const parent = state.entities[entity.parentId];
        if (!parent) return state;

        const oldIndex = parent.childIds.indexOf(id);
        if (oldIndex === -1 || oldIndex === newIndex) return state;

        // Remove from old position and insert at new position
        const newChildIds = [...parent.childIds];
        newChildIds.splice(oldIndex, 1);
        newChildIds.splice(newIndex, 0, id);

        return {
          entities: {
            ...state.entities,
            [entity.parentId]: {
              ...parent,
              childIds: newChildIds,
            },
          },
        };
      } else {
        // Entity is at root level
        const oldIndex = state.rootIds.indexOf(id);
        if (oldIndex === -1 || oldIndex === newIndex) return state;

        // Remove from old position and insert at new position
        const newRootIds = [...state.rootIds];
        newRootIds.splice(oldIndex, 1);
        newRootIds.splice(newIndex, 0, id);

        return {
          rootIds: newRootIds,
        };
      }
    }),

  moveToParent: (id, newParentId, index) =>
    set((state) => {
      const entity = state.entities[id];
      if (!entity) return state;

      // Prevent moving entity into itself or its descendants
      if (newParentId === id) return state;

      const isDescendant = (parentId: string, childId: string): boolean => {
        const parent = state.entities[parentId];
        if (!parent) return false;
        if (parent.childIds.includes(childId)) return true;
        return parent.childIds.some((cid) => isDescendant(cid, childId));
      };

      if (newParentId && isDescendant(id, newParentId)) return state;

      const newEntities = { ...state.entities };
      let newRootIds = state.rootIds;

      // Remove from old parent
      if (entity.parentId) {
        const oldParent = state.entities[entity.parentId];
        if (oldParent) {
          newEntities[entity.parentId] = {
            ...oldParent,
            childIds: oldParent.childIds.filter((cid) => cid !== id),
          };
        }
      } else {
        newRootIds = state.rootIds.filter((rid) => rid !== id);
      }

      // Add to new parent
      if (newParentId) {
        const newParent = state.entities[newParentId];
        if (!newParent) return state;

        const newChildIds = [...newParent.childIds];
        const insertIndex = index !== undefined ? index : newChildIds.length;
        newChildIds.splice(insertIndex, 0, id);

        newEntities[newParentId] = {
          ...newParent,
          childIds: newChildIds,
        };
      } else {
        const insertIndex = index !== undefined ? index : newRootIds.length;
        newRootIds = [...newRootIds];
        newRootIds.splice(insertIndex, 0, id);
      }

      // Update entity's parentId
      newEntities[id] = {
        ...entity,
        parentId: newParentId ?? null,
      };

      return {
        entities: newEntities,
        rootIds: newRootIds,
      };
    }),
}));

/**
 * Selector: Get entity count
 */
export const selectEntityCount = (state: SceneState): number =>
  Object.keys(state.entities).length;

/**
 * Selector: Check if entity exists
 */
export const selectEntityExists = (state: SceneState, id: string): boolean =>
  id in state.entities;
