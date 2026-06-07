/**
 * ReparentEntityCommand
 *
 * Command for moving an entity to a new parent with undo/redo support.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';

/**
 * Command to reparent an entity (move to different parent)
 */
export class ReparentEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  /**
   * Create a new ReparentEntityCommand
   *
   * @param entityId - The ID of the entity to move
   * @param oldParentId - The previous parent ID (null for root)
   * @param newParentId - The new parent ID (null for root)
   * @param oldIndex - The previous index in old parent's children
   * @param newIndex - The index to insert at in new parent's children
   */
  constructor(
    private readonly entityId: string,
    private readonly oldParentId: string | null,
    private readonly newParentId: string | null,
    private readonly oldIndex: number,
    private readonly newIndex?: number
  ) {
    if (newParentId) {
      const parentName = useSceneStore.getState().entities[newParentId]?.name ?? 'Group';
      this.description = `Move into ${parentName}`;
    } else {
      this.description = 'Move to root';
    }
  }

  /**
   * Execute the reparent (move to new parent)
   */
  execute(): void {
    useSceneStore.getState().moveToParent(this.entityId, this.newParentId, this.newIndex);
  }

  /**
   * Undo the reparent (restore to old parent at old index)
   */
  undo(): void {
    useSceneStore.getState().moveToParent(this.entityId, this.oldParentId, this.oldIndex);
  }
}
