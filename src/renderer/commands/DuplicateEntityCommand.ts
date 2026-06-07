/**
 * DuplicateEntityCommand
 *
 * Command for duplicating entities with undo/redo support.
 * Creates copies of selected entities with offset positions.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import type { Entity } from '../types/entity';

/** Offset for duplicated entities to make them visible */
const DUPLICATE_OFFSET = { x: 1, y: 0, z: 1 };

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

/**
 * Command for duplicating entities
 */
export class DuplicateEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  private createdEntityIds: string[] = [];
  private previousSelection: string[] = [];

  constructor(private readonly sourceEntityIds: string[]) {
    const count = sourceEntityIds.length;
    this.description = count === 1 ? 'Duplicate entity' : `Duplicate ${count} entities`;
  }

  execute(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();

    // Store previous selection for undo
    this.previousSelection = [...selectionStore.selectedIds];

    // Clear created IDs for re-execution
    this.createdEntityIds = [];

    // Duplicate each entity
    for (const sourceId of this.sourceEntityIds) {
      const sourceEntity = sceneStore.entities[sourceId];
      if (!sourceEntity) continue;

      // Create new entity with new ID
      const newId = generateUUID();
      const newEntity: Entity = {
        ...sourceEntity,
        id: newId,
        name: `${sourceEntity.name} Copy`,
        transform: {
          position: {
            x: sourceEntity.transform.position.x + DUPLICATE_OFFSET.x,
            y: sourceEntity.transform.position.y + DUPLICATE_OFFSET.y,
            z: sourceEntity.transform.position.z + DUPLICATE_OFFSET.z,
          },
          rotation: { ...sourceEntity.transform.rotation },
          scale: { ...sourceEntity.transform.scale },
        },
        parentId: sourceEntity.parentId,
        childIds: [], // Don't copy children (could be added later)
      };

      // Add to scene
      sceneStore.addEntity(newEntity, sourceEntity.parentId ?? undefined);
      this.createdEntityIds.push(newId);
    }

    // Select the duplicated entities
    if (this.createdEntityIds.length > 0) {
      selectionStore.setSelected(this.createdEntityIds);
    }
  }

  undo(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();

    // Remove duplicated entities
    for (const id of this.createdEntityIds) {
      sceneStore.removeEntity(id);
    }

    // Restore previous selection
    selectionStore.setSelected(this.previousSelection);
  }
}
