/**
 * UngroupEntitiesCommand
 *
 * Command for ungrouping a group entity, moving its children to the parent level.
 * Supports undo/redo via the Command pattern.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import type { Entity } from '../types/entity';
import { EntityType } from '../types/entity';

/**
 * Command to ungroup a group entity
 *
 * This command moves all children of a group to the group's parent level,
 * then removes the group entity.
 */
export class UngroupEntitiesCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  private groupId: string;
  private groupEntity: Entity | null = null;
  private childIds: string[];
  private groupIndex: number = 0;

  /**
   * Create a new UngroupEntitiesCommand
   *
   * @param groupId - The ID of the group entity to ungroup
   */
  constructor(groupId: string) {
    this.groupId = groupId;
    this.description = 'Ungroup entities';

    // Store group info for undo
    const state = useSceneStore.getState();
    const group = state.entities[groupId];

    if (group && group.type === EntityType.Group) {
      this.groupEntity = { ...group };
      this.childIds = [...group.childIds];

      // Store the group's index in its parent's children or rootIds
      if (group.parentId) {
        const parent = state.entities[group.parentId];
        if (parent) {
          this.groupIndex = parent.childIds.indexOf(groupId);
        }
      } else {
        this.groupIndex = state.rootIds.indexOf(groupId);
      }
    } else {
      this.childIds = [];
    }
  }

  /**
   * Check if the group can be ungrouped
   */
  canExecute(): boolean {
    return this.groupEntity !== null && this.groupEntity.type === EntityType.Group;
  }

  /**
   * Execute the ungroup operation
   */
  execute(): void {
    if (!this.canExecute()) {
      return;
    }

    const state = useSceneStore.getState();
    const parentId = this.groupEntity!.parentId;

    // Move each child to the group's parent level
    for (let i = 0; i < this.childIds.length; i++) {
      const childId = this.childIds[i];
      state.moveToParent(childId, parentId, this.groupIndex + i);
    }

    // Remove the group entity
    state.removeEntity(this.groupId);

    // Select the ungrouped children
    useSelectionStore.getState().setSelected([...this.childIds]);
  }

  /**
   * Undo the ungroup operation
   */
  undo(): void {
    if (!this.groupEntity) {
      return;
    }

    const state = useSceneStore.getState();

    // Re-add the group entity (without children - moveToParent will add them)
    const groupWithoutChildren = {
      ...this.groupEntity,
      childIds: [],
    };

    if (this.groupEntity.parentId) {
      state.addEntity(groupWithoutChildren, this.groupEntity.parentId);
    } else {
      state.addEntity(groupWithoutChildren);
    }

    // Move group to correct index
    state.reorderEntity(this.groupId, this.groupIndex);

    // Move children back into the group
    for (const childId of this.childIds) {
      state.moveToParent(childId, this.groupId);
    }

    // Select the group
    useSelectionStore.getState().setSelected([this.groupId]);
  }
}
