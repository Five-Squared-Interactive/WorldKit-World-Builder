/**
 * PasteEntitiesCommand
 *
 * Command for pasting entities from clipboard with undo/redo support.
 * Regenerates entity IDs and reconstructs hierarchy.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useClipboardStore, type ClipboardEntry } from '../stores/clipboardStore';
import type { Entity } from '../types/entity';
import { EntityType } from '../types/entity';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Offset for pasted entities to make them visible */
const PASTE_OFFSET = { x: 0.5, y: 0, z: 0.5 };

/**
 * Command for pasting entities from clipboard
 */
export class PasteEntitiesCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  private createdEntityIds: string[] = [];
  private previousSelection: string[] = [];
  private clipboardSnapshot: ClipboardEntry | null = null;
  private wasCutOperation = false;

  /**
   * Create a new PasteEntitiesCommand
   *
   * @param targetParentId - Optional parent to paste into (null for root)
   */
  constructor(private readonly targetParentId?: string | null) {
    this.description = 'Paste';
  }

  execute(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();
    const clipboardStore = useClipboardStore.getState();

    const clipboard = clipboardStore.getContents();
    if (!clipboard || clipboard.entities.length === 0) {
      return;
    }

    // Store clipboard snapshot for undo
    this.clipboardSnapshot = clipboard;
    this.wasCutOperation = clipboard.operation === 'cut';

    // Store previous selection for undo
    this.previousSelection = [...selectionStore.selectedIds];

    // Clear created IDs for re-execution
    this.createdEntityIds = [];

    // Build ID mapping (old ID -> new ID)
    const idMap = new Map<string, string>();
    for (const serialized of clipboard.entities) {
      idMap.set(serialized.entity.id, generateUUID());
    }

    // Determine target parent
    let actualTargetParentId: string | null = null;
    if (this.targetParentId !== undefined) {
      actualTargetParentId = this.targetParentId;
    } else {
      // If a single Group is selected, paste into it
      if (selectionStore.selectedIds.length === 1) {
        const selected = sceneStore.entities[selectionStore.selectedIds[0]];
        if (selected && selected.type === EntityType.Group) {
          actualTargetParentId = selected.id;
        }
      }
    }

    // Create new entities with updated IDs and parent references
    const newEntities: Entity[] = [];

    for (const serialized of clipboard.entities) {
      const oldEntity = serialized.entity;
      const newId = idMap.get(oldEntity.id);
      if (!newId) continue; // Skip if no mapping (shouldn't happen)

      // Determine new parent
      let newParentId: string | null;
      if (clipboard.rootIds.includes(oldEntity.id)) {
        // Root entity in clipboard - paste at target location
        newParentId = actualTargetParentId;
      } else {
        // Child entity - map to new parent ID
        newParentId = oldEntity.parentId ? (idMap.get(oldEntity.parentId) ?? null) : null;
      }

      // Note: Don't set childIds here - addEntity will handle parent-child relationships
      // when we add child entities with their parentId set

      // Apply offset only to root entities
      const position = clipboard.rootIds.includes(oldEntity.id)
        ? {
            x: oldEntity.transform.position.x + PASTE_OFFSET.x,
            y: oldEntity.transform.position.y + PASTE_OFFSET.y,
            z: oldEntity.transform.position.z + PASTE_OFFSET.z,
          }
        : { ...oldEntity.transform.position };

      const newEntity: Entity = {
        ...oldEntity,
        id: newId,
        parentId: newParentId,
        childIds: [], // Empty - addEntity will populate when children are added
        transform: {
          position,
          rotation: { ...oldEntity.transform.rotation },
          scale: { ...oldEntity.transform.scale },
        },
      };

      newEntities.push(newEntity);
      this.createdEntityIds.push(newId);
    }

    // Add entities to scene (parents first, then children)
    const rootNewEntities = newEntities.filter((e) =>
      clipboard.rootIds.includes(
        [...idMap.entries()].find(([, newId]) => newId === e.id)?.[0] ?? ''
      )
    );
    const childNewEntities = newEntities.filter(
      (e) =>
        !clipboard.rootIds.includes(
          [...idMap.entries()].find(([, newId]) => newId === e.id)?.[0] ?? ''
        )
    );

    // Add root entities first
    rootNewEntities.forEach((entity) => {
      sceneStore.addEntity(entity, entity.parentId ?? undefined);
    });

    // Add child entities
    childNewEntities.forEach((entity) => {
      sceneStore.addEntity(entity, entity.parentId ?? undefined);
    });

    // Select the pasted root entities
    const rootNewIds = rootNewEntities.map((e) => e.id);
    if (rootNewIds.length > 0) {
      selectionStore.setSelected(rootNewIds);
    }

    // If this was a cut operation, clear the clipboard
    if (this.wasCutOperation) {
      clipboardStore.clear();
    }
  }

  undo(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();

    // Remove pasted entities
    for (const id of this.createdEntityIds) {
      sceneStore.removeEntity(id);
    }

    // Restore previous selection
    selectionStore.setSelected(this.previousSelection);

    // Restore clipboard if it was a cut operation
    if (this.wasCutOperation && this.clipboardSnapshot) {
      useClipboardStore.setState({ clipboard: this.clipboardSnapshot });
    }
  }
}
