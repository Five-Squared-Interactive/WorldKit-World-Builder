/**
 * DeleteEntityCommand
 *
 * Command for deleting entities from the scene with undo/redo support.
 * Stores the deleted entity data to restore on undo.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import type { Entity } from '../types/entity';

/**
 * Command for deleting an entity and its descendants
 */
export class DeleteEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  private deletedEntities: Entity[] = [];
  private deletedFromSelection: string[] = [];

  constructor(private readonly entityIds: string[]) {
    const count = entityIds.length;
    this.description = count === 1 ? 'Delete entity' : `Delete ${count} entities`;
  }

  execute(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();

    // Collect all entities to delete (including descendants)
    this.deletedEntities = [];
    this.deletedFromSelection = [];

    const collectEntity = (id: string) => {
      const entity = sceneStore.entities[id];
      if (entity) {
        // Store a deep copy
        this.deletedEntities.push({
          ...entity,
          transform: { ...entity.transform },
        });
        // Collect children recursively
        entity.childIds.forEach(collectEntity);
      }
    };

    // Collect all entities
    this.entityIds.forEach(collectEntity);

    // Track which were selected
    this.deletedFromSelection = this.entityIds.filter((id) =>
      selectionStore.selectedIds.includes(id)
    );

    // Remove from selection first
    if (this.deletedFromSelection.length > 0) {
      selectionStore.removeFromSelection(this.deletedFromSelection);
    }

    // Delete entities (removeEntity handles descendants)
    this.entityIds.forEach((id) => {
      sceneStore.removeEntity(id);
    });
  }

  undo(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();

    // Restore entities in reverse order (children before parents need to go last)
    // Actually, we need parents before children, so reverse the deletion order
    const entitiesToRestore = [...this.deletedEntities].reverse();

    // Group by parentId for proper restoration
    const rootEntities = entitiesToRestore.filter((e) => e.parentId === null);
    const childEntities = entitiesToRestore.filter((e) => e.parentId !== null);

    // Restore root entities first
    rootEntities.forEach((entity) => {
      sceneStore.addEntity(entity);
    });

    // Restore child entities
    childEntities.forEach((entity) => {
      sceneStore.addEntity(entity, entity.parentId ?? undefined);
    });

    // Restore selection
    if (this.deletedFromSelection.length > 0) {
      selectionStore.addToSelection(this.deletedFromSelection);
    }
  }
}
