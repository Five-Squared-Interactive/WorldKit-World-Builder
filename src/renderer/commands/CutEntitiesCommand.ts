/**
 * CutEntitiesCommand
 *
 * Command for cutting entities to clipboard with undo/redo support.
 * Serializes entities to clipboard and removes them from scene.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useClipboardStore } from '../stores/clipboardStore';
import type { Entity } from '../types/entity';

/**
 * Command for cutting entities (copy to clipboard + delete)
 */
export class CutEntitiesCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  private deletedEntities: Entity[] = [];
  private deletedFromSelection: string[] = [];
  private previousClipboard: ReturnType<typeof useClipboardStore.getState>['clipboard'] = null;

  constructor(private readonly entityIds: string[]) {
    const count = entityIds.length;
    this.description = count === 1 ? 'Cut entity' : `Cut ${count} entities`;
  }

  execute(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();
    const clipboardStore = useClipboardStore.getState();

    // Store previous clipboard for undo
    this.previousClipboard = clipboardStore.clipboard;

    // Collect all entities to cut (including descendants)
    this.deletedEntities = [];
    this.deletedFromSelection = [];

    const collectEntity = (id: string) => {
      const entity = sceneStore.entities[id];
      if (entity) {
        // Store a deep copy
        this.deletedEntities.push({
          ...entity,
          transform: {
            position: { ...entity.transform.position },
            rotation: { ...entity.transform.rotation },
            scale: { ...entity.transform.scale },
          },
          childIds: [...entity.childIds],
        });
        // Collect children recursively
        entity.childIds.forEach(collectEntity);
      }
    };

    // Filter to top-level entities (remove descendants of other selected entities)
    const topLevelIds = this.filterTopLevel(this.entityIds, sceneStore.entities);

    // Collect all entities
    topLevelIds.forEach(collectEntity);

    // Track which were selected
    this.deletedFromSelection = this.entityIds.filter((id) =>
      selectionStore.selectedIds.includes(id)
    );

    // Set clipboard for cut operation
    clipboardStore.setForCut(this.entityIds);

    // Remove from selection first
    if (this.deletedFromSelection.length > 0) {
      selectionStore.removeFromSelection(this.deletedFromSelection);
    }

    // Delete entities (removeEntity handles descendants)
    topLevelIds.forEach((id) => {
      sceneStore.removeEntity(id);
    });
  }

  undo(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();
    const clipboardStore = useClipboardStore.getState();

    // Restore entities in correct order (parents before children)
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

    // Restore previous clipboard
    if (this.previousClipboard) {
      // Directly set clipboard state
      useClipboardStore.setState({ clipboard: this.previousClipboard });
    } else {
      clipboardStore.clear();
    }
  }

  /**
   * Filter to only top-level entities (exclude descendants of other selected)
   */
  private filterTopLevel(entityIds: string[], entities: Record<string, Entity>): string[] {
    const idSet = new Set(entityIds);

    return entityIds.filter((id) => {
      const entity = entities[id];
      if (!entity) return false;

      let parentId = entity.parentId;
      while (parentId) {
        if (idSet.has(parentId)) {
          return false;
        }
        parentId = entities[parentId]?.parentId ?? null;
      }

      return true;
    });
  }
}
