/**
 * ChangeColorCommand
 *
 * Command for changing an entity's color with undo/redo support.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';

/**
 * Command to change an entity's color
 */
export class ChangeColorCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  /**
   * Create a new ChangeColorCommand
   *
   * @param entityId - The ID of the entity to change
   * @param oldColor - The color before the change (undefined for default)
   * @param newColor - The color after the change
   */
  constructor(
    private readonly entityId: string,
    private readonly oldColor: string | undefined,
    private readonly newColor: string
  ) {
    this.description = `Change color to ${newColor}`;
  }

  /**
   * Execute the color change (apply new color)
   */
  execute(): void {
    useSceneStore.getState().updateEntity(this.entityId, {
      color: this.newColor,
    });
  }

  /**
   * Undo the color change (restore old color)
   */
  undo(): void {
    useSceneStore.getState().updateEntity(this.entityId, {
      color: this.oldColor,
    });
  }
}
