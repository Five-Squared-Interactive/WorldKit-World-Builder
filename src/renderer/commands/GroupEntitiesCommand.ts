/**
 * GroupEntitiesCommand
 *
 * Command for grouping selected entities under a new group entity.
 * Supports undo/redo via the Command pattern.
 */

import type { Command } from '../stores/commandStore';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { createEntity, EntityType } from '../types/entity';
import type { Entity } from '../types/entity';

/**
 * Generate a unique group name
 */
function generateGroupName(): string {
  const entities = useSceneStore.getState().entities;
  const existingNames = Object.values(entities)
    .filter((e) => e.type === EntityType.Group)
    .map((e) => e.name);

  let name = 'Group';
  let counter = 1;

  while (existingNames.includes(name)) {
    name = `Group (${counter})`;
    counter++;
  }

  return name;
}

/**
 * Command to group entities under a new parent group
 *
 * This command creates a new Group entity and moves the specified
 * entities to be children of that group.
 */
export class GroupEntitiesCommand implements Command {
  readonly description: string;
  readonly canMerge = false;

  private groupEntity: Entity;
  private entityIds: string[];
  private originalParentIds: Map<string, string | null>;
  private originalChildIndices: Map<string, number>;
  private groupInsertIndex: number;

  /**
   * Create a new GroupEntitiesCommand
   *
   * @param entityIds - The IDs of the entities to group
   * @param groupId - Optional ID for the new group (generated if not provided)
   */
  constructor(entityIds: string[], groupId?: string) {
    this.entityIds = [...entityIds];
    this.originalParentIds = new Map();
    this.originalChildIndices = new Map();
    this.description = 'Group entities';

    // Store original parent info for undo
    const state = useSceneStore.getState();
    for (const id of entityIds) {
      const entity = state.entities[id];
      if (entity) {
        this.originalParentIds.set(id, entity.parentId);

        // Store the index in parent's children or rootIds
        if (entity.parentId) {
          const parent = state.entities[entity.parentId];
          if (parent) {
            this.originalChildIndices.set(id, parent.childIds.indexOf(id));
          }
        } else {
          this.originalChildIndices.set(id, state.rootIds.indexOf(id));
        }
      }
    }

    // Determine where to insert the group (at the first entity's position)
    const firstEntity = state.entities[entityIds[0]];
    if (firstEntity?.parentId) {
      const parent = state.entities[firstEntity.parentId];
      this.groupInsertIndex = parent?.childIds.indexOf(entityIds[0]) ?? 0;
    } else {
      this.groupInsertIndex = state.rootIds.indexOf(entityIds[0]);
    }

    // Create the group entity (without childIds - moveToParent will add them)
    this.groupEntity = createEntity(
      groupId ?? crypto.randomUUID(),
      generateGroupName(),
      EntityType.Group,
      {
        parentId: firstEntity?.parentId ?? null,
      }
    );
  }

  /**
   * Execute the group operation
   */
  execute(): void {
    const state = useSceneStore.getState();

    // Add the group entity at the correct position
    if (this.groupEntity.parentId) {
      state.addEntity(this.groupEntity, this.groupEntity.parentId);
      // Move group to correct index
      state.reorderEntity(this.groupEntity.id, this.groupInsertIndex);
    } else {
      state.addEntity(this.groupEntity);
      // Move group to correct index
      state.reorderEntity(this.groupEntity.id, this.groupInsertIndex);
    }

    // Move each entity to be a child of the group
    for (const id of this.entityIds) {
      state.moveToParent(id, this.groupEntity.id);
    }

    // Select the group
    useSelectionStore.getState().setSelected([this.groupEntity.id]);
  }

  /**
   * Undo the group operation
   */
  undo(): void {
    const state = useSceneStore.getState();

    // Move entities back to their original parents
    for (const id of this.entityIds) {
      const originalParent = this.originalParentIds.get(id) ?? null;
      const originalIndex = this.originalChildIndices.get(id) ?? 0;
      state.moveToParent(id, originalParent, originalIndex);
    }

    // Remove the group entity
    state.removeEntity(this.groupEntity.id);

    // Restore selection to the original entities
    useSelectionStore.getState().setSelected(this.entityIds);
  }

  /**
   * Get the group entity ID (for testing)
   */
  getGroupId(): string {
    return this.groupEntity.id;
  }
}
