/**
 * Add Primitive Handler
 *
 * Handles adding primitive objects to the scene.
 * Creates entity via factory and executes AddEntityCommand for undo/redo support.
 */

import type { PrimitiveType } from '../../../shared/types/ipc';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { useCommandStore } from '../../stores/commandStore';
import { createPrimitiveEntity } from './createPrimitive';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

/**
 * Get all existing entity names from the scene store
 * @returns Array of entity names
 */
function getExistingEntityNames(): string[] {
  const entities = useSceneStore.getState().entities;
  return Object.values(entities).map((entity) => entity.name);
}

/**
 * Add a primitive object to the scene
 * Creates the entity and executes AddEntityCommand for undo/redo support.
 *
 * @param type - The type of primitive to add ('cube', 'sphere', 'plane')
 * @returns The ID of the created entity
 */
export function handleAddPrimitive(type: PrimitiveType): string {
  const existingNames = getExistingEntityNames();
  const entity = createPrimitiveEntity(type, existingNames);

  // Create and execute command (enables undo/redo)
  const command = new AddEntityCommand(entity);
  useCommandStore.getState().execute(command);

  // Mark project as dirty (has unsaved changes)
  useProjectStore.getState().markDirty();

  return entity.id;
}
