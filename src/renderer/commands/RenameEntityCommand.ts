/**
 * RenameEntityCommand
 *
 * Command for renaming an entity.
 * Supports undo/redo via the Command pattern.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';

/**
 * Command to rename an entity
 *
 * This command stores both old and new names to enable
 * undo/redo functionality. It updates the entity's name
 * in the sceneStore.
 */
export class RenameEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  /**
   * Create a new RenameEntityCommand
   *
   * @param entityId - The ID of the entity to rename
   * @param oldName - The name before the rename
   * @param newName - The name after the rename
   */
  constructor(
    private readonly entityId: string,
    private readonly oldName: string,
    private readonly newName: string
  ) {
    this.description = `Rename to "${newName}"`;
  }

  /**
   * Execute the rename (apply new name)
   */
  execute(): void {
    useSceneStore.getState().updateEntity(this.entityId, {
      name: this.newName,
    });
  }

  /**
   * Undo the rename (restore old name)
   */
  undo(): void {
    useSceneStore.getState().updateEntity(this.entityId, {
      name: this.oldName,
    });
  }
}
