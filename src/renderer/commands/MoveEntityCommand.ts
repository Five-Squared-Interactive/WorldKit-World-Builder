// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * MoveEntityCommand
 *
 * Command for moving an entity to a new position.
 * Supports undo/redo via the Command pattern.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import type { Vector3 } from '../types/entity';

/**
 * Command to move an entity to a new position
 *
 * This command stores both old and new positions to enable
 * undo/redo functionality. It updates the entity's transform
 * in the sceneStore.
 */
export class MoveEntityCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  /**
   * Create a new MoveEntityCommand
   *
   * @param entityId - The ID of the entity to move
   * @param oldPosition - The position before the move
   * @param newPosition - The position after the move
   */
  constructor(
    private readonly entityId: string,
    private readonly oldPosition: Vector3,
    private readonly newPosition: Vector3
  ) {
    this.description = 'Move entity';
  }

  /**
   * Execute the move (apply new position)
   */
  execute(): void {
    useSceneStore.getState().updateEntityTransform(this.entityId, {
      position: { ...this.newPosition },
    });
  }

  /**
   * Undo the move (restore old position)
   */
  undo(): void {
    useSceneStore.getState().updateEntityTransform(this.entityId, {
      position: { ...this.oldPosition },
    });
  }
}
