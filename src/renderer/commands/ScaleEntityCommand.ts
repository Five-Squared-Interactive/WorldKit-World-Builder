/**
 * ScaleEntityCommand
 *
 * Command for scaling an entity to a new size.
 * Supports undo/redo via the Command pattern.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import type { Vector3 } from '../types/entity';

/**
 * Command to scale an entity to a new size
 *
 * This command stores both old and new scale values to enable
 * undo/redo functionality. It updates the entity's transform
 * in the sceneStore.
 */
export class ScaleEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  /**
   * Create a new ScaleEntityCommand
   *
   * @param entityId - The ID of the entity to scale
   * @param oldScale - The scale before the change
   * @param newScale - The scale after the change
   */
  constructor(
    private readonly entityId: string,
    private readonly oldScale: Vector3,
    private readonly newScale: Vector3
  ) {
    this.description = 'Scale entity';
  }

  /**
   * Execute the scale (apply new scale)
   */
  execute(): void {
    useSceneStore.getState().updateEntityTransform(this.entityId, {
      scale: { ...this.newScale },
    });
  }

  /**
   * Undo the scale (restore old scale)
   */
  undo(): void {
    useSceneStore.getState().updateEntityTransform(this.entityId, {
      scale: { ...this.oldScale },
    });
  }
}
