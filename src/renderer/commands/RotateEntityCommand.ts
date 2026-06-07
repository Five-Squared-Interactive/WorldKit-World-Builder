/**
 * RotateEntityCommand
 *
 * Command for rotating an entity to a new orientation.
 * Supports undo/redo via the Command pattern.
 * Stores quaternion values (x, y, z, w) for precise rotation.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import type { Quaternion } from '../types/entity';

/**
 * Command to rotate an entity to a new orientation
 *
 * This command stores both old and new quaternion rotations to enable
 * undo/redo functionality. It updates the entity's transform
 * in the sceneStore.
 */
export class RotateEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  /**
   * Create a new RotateEntityCommand
   *
   * @param entityId - The ID of the entity to rotate
   * @param oldRotation - The quaternion rotation before the change
   * @param newRotation - The quaternion rotation after the change
   */
  constructor(
    private readonly entityId: string,
    private readonly oldRotation: Quaternion,
    private readonly newRotation: Quaternion
  ) {
    this.description = 'Rotate entity';
  }

  /**
   * Execute the rotation (apply new rotation)
   */
  execute(): void {
    useSceneStore.getState().updateEntityTransform(this.entityId, {
      rotation: { ...this.newRotation },
    });
  }

  /**
   * Undo the rotation (restore old rotation)
   */
  undo(): void {
    useSceneStore.getState().updateEntityTransform(this.entityId, {
      rotation: { ...this.oldRotation },
    });
  }
}
