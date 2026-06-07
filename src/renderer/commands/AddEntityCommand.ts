/**
 * AddEntityCommand
 *
 * Command for adding entities to the scene with undo/redo support.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import type { Entity } from '../types/entity';

/**
 * Command for adding an entity to the scene
 */
export class AddEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  private previousSelection: string[] = [];

  constructor(
    private readonly entity: Entity,
    private readonly selectAfterAdd: boolean = true
  ) {
    this.description = `Add ${entity.name}`;
  }

  execute(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();

    // Store previous selection for undo
    this.previousSelection = [...selectionStore.selectedIds];

    // Add entity to scene (pass parentId to preserve hierarchy)
    sceneStore.addEntity(this.entity, this.entity.parentId ?? undefined);

    // Select the new entity
    if (this.selectAfterAdd) {
      selectionStore.setSelected([this.entity.id]);
    }
  }

  undo(): void {
    const sceneStore = useSceneStore.getState();
    const selectionStore = useSelectionStore.getState();

    // Remove the entity
    sceneStore.removeEntity(this.entity.id);

    // Restore previous selection
    selectionStore.setSelected(this.previousSelection);
  }
}
