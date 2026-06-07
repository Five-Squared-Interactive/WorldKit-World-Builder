/**
 * Clipboard Store
 *
 * Zustand store for managing clipboard state for cut/copy/paste operations.
 * Stores serialized entities with hierarchy information.
 */

import { create } from 'zustand';
import type { Entity } from '../types/entity';
import { useSceneStore } from './sceneStore';

/**
 * Serialized entity with hierarchy context
 */
export interface SerializedEntity {
  /** The entity data (deep clone) */
  entity: Entity;
  /** Original parent ID for context */
  originalParentId: string | null;
  /** Position among siblings */
  siblingIndex: number;
}

/**
 * Clipboard entry containing entities and metadata
 */
export interface ClipboardEntry {
  /** Serialized entities with hierarchy data */
  entities: SerializedEntity[];
  /** IDs of root entities in this clipboard (top-level of selection) */
  rootIds: string[];
  /** Whether this was a cut or copy operation */
  operation: 'cut' | 'copy';
  /** Original IDs (for cut cleanup) */
  sourceIds: string[];
}

/**
 * Clipboard store state
 */
export interface ClipboardState {
  /** Current clipboard contents */
  clipboard: ClipboardEntry | null;
}

/**
 * Clipboard store actions
 */
export interface ClipboardActions {
  /**
   * Copy entities to clipboard (non-destructive)
   * @param entityIds - IDs of entities to copy
   */
  copyEntities: (entityIds: string[]) => void;

  /**
   * Set clipboard for cut operation (entities will be removed separately)
   * @param entityIds - IDs of entities being cut
   */
  setForCut: (entityIds: string[]) => void;

  /**
   * Clear the clipboard
   */
  clear: () => void;

  /**
   * Check if clipboard has content
   */
  hasContent: () => boolean;

  /**
   * Get clipboard contents
   */
  getContents: () => ClipboardEntry | null;
}

/**
 * Combined clipboard store type
 */
export type ClipboardStore = ClipboardState & ClipboardActions;

/**
 * Collect entity and all descendants recursively
 */
function collectEntityHierarchy(
  entityId: string,
  entities: Record<string, Entity>,
  result: SerializedEntity[],
  siblingIndex: number
): void {
  const entity = entities[entityId];
  if (!entity) return;

  // Deep clone the entity
  const serialized: SerializedEntity = {
    entity: {
      ...entity,
      transform: {
        position: { ...entity.transform.position },
        rotation: { ...entity.transform.rotation },
        scale: { ...entity.transform.scale },
      },
      childIds: [...entity.childIds],
    },
    originalParentId: entity.parentId,
    siblingIndex,
  };

  result.push(serialized);

  // Collect children
  entity.childIds.forEach((childId, childIndex) => {
    collectEntityHierarchy(childId, entities, result, childIndex);
  });
}

/**
 * Filter out entities that are descendants of other entities in the selection
 * to avoid duplicates when pasting
 */
function filterTopLevelSelection(entityIds: string[], entities: Record<string, Entity>): string[] {
  const idSet = new Set(entityIds);

  return entityIds.filter((id) => {
    const entity = entities[id];
    if (!entity) return false;

    // Walk up the parent chain to see if any ancestor is in the selection
    let parentId = entity.parentId;
    while (parentId) {
      if (idSet.has(parentId)) {
        return false; // This entity is a descendant of another selected entity
      }
      parentId = entities[parentId]?.parentId ?? null;
    }

    return true;
  });
}

/**
 * Clipboard store instance
 */
export const useClipboardStore = create<ClipboardStore>((set, get) => ({
  // State
  clipboard: null,

  // Actions
  copyEntities: (entityIds) => {
    const entities = useSceneStore.getState().entities;
    const topLevelIds = filterTopLevelSelection(entityIds, entities);

    const serializedEntities: SerializedEntity[] = [];

    topLevelIds.forEach((id, index) => {
      collectEntityHierarchy(id, entities, serializedEntities, index);
    });

    set({
      clipboard: {
        entities: serializedEntities,
        rootIds: topLevelIds,
        operation: 'copy',
        sourceIds: [...entityIds],
      },
    });
  },

  setForCut: (entityIds) => {
    const entities = useSceneStore.getState().entities;
    const topLevelIds = filterTopLevelSelection(entityIds, entities);

    const serializedEntities: SerializedEntity[] = [];

    topLevelIds.forEach((id, index) => {
      collectEntityHierarchy(id, entities, serializedEntities, index);
    });

    set({
      clipboard: {
        entities: serializedEntities,
        rootIds: topLevelIds,
        operation: 'cut',
        sourceIds: [...entityIds],
      },
    });
  },

  clear: () => set({ clipboard: null }),

  hasContent: () => {
    const clipboard = get().clipboard;
    return clipboard !== null && clipboard.entities.length > 0;
  },

  getContents: () => get().clipboard,
}));

/**
 * Selector: Check if clipboard has content
 */
export const selectHasClipboardContent = (state: ClipboardState): boolean =>
  state.clipboard !== null && state.clipboard.entities.length > 0;

/**
 * Selector: Get clipboard operation type
 */
export const selectClipboardOperation = (state: ClipboardState): 'cut' | 'copy' | null =>
  state.clipboard?.operation ?? null;
