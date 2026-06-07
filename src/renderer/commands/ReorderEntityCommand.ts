/**
 * ReorderEntityCommand
 *
 * Command for reordering an entity within its sibling list.
 * Supports undo/redo via the Command pattern.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';

/**
 * Command to reorder an entity
 *
 * This command stores both old and new indices to enable
 * undo/redo functionality. It updates the entity's position
 * in the parent's childIds or rootIds.
 */
export class ReorderEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  /**
   * Create a new ReorderEntityCommand
   *
   * @param entityId - The ID of the entity to reorder
   * @param oldIndex - The index before reordering
   * @param newIndex - The index after reordering
   */
  constructor(
    private readonly entityId: string,
    private readonly oldIndex: number,
    private readonly newIndex: number
  ) {
    this.description = 'Reorder entity';
  }

  /**
   * Execute the reorder (apply new index)
   */
  execute(): void {
    useSceneStore.getState().reorderEntity(this.entityId, this.newIndex);
  }

  /**
   * Undo the reorder (restore old index)
   */
  undo(): void {
    useSceneStore.getState().reorderEntity(this.entityId, this.oldIndex);
  }
}
