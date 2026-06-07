/**
 * AddEntityCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AddEntityCommand } from './AddEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { createEntity, EntityType } from '../types/entity';

describe('AddEntityCommand', () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
    useSelectionStore.getState().clearSelection();
  });

  it('should have correct description', () => {
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    const command = new AddEntityCommand(entity);
    expect(command.description).toBe('Add Test Cube');
  });

  it('should add entity to scene on execute', () => {
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    const command = new AddEntityCommand(entity);

    command.execute();

    expect(useSceneStore.getState().entities['entity-1']).toBeDefined();
  });

  it('should select the new entity after adding', () => {
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    const command = new AddEntityCommand(entity);

    command.execute();

    expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);
  });

  it('should not select entity if selectAfterAdd is false', () => {
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    const command = new AddEntityCommand(entity, false);

    command.execute();

    expect(useSelectionStore.getState().selectedIds).toEqual([]);
  });

  it('should remove entity on undo', () => {
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    const command = new AddEntityCommand(entity);

    command.execute();
    expect(useSceneStore.getState().entities['entity-1']).toBeDefined();

    command.undo();
    expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
  });

  it('should restore previous selection on undo', () => {
    // Set up existing entity and selection
    const existing = createEntity('existing-1', 'Existing', EntityType.SphereMesh);
    useSceneStore.getState().addEntity(existing);
    useSelectionStore.getState().setSelected(['existing-1']);

    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    const command = new AddEntityCommand(entity);

    command.execute();
    expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);

    command.undo();
    expect(useSelectionStore.getState().selectedIds).toEqual(['existing-1']);
  });

  it('should preserve entity transform', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh, {
      transform: {
        position: { x: 5, y: 10, z: 15 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 2, y: 2, z: 2 },
      },
    });
    const command = new AddEntityCommand(entity);

    command.execute();

    const added = useSceneStore.getState().entities['entity-1'];
    expect(added?.transform.position).toEqual({ x: 5, y: 10, z: 15 });
    expect(added?.transform.scale).toEqual({ x: 2, y: 2, z: 2 });
  });

  it('should not be mergeable', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    const command = new AddEntityCommand(entity);
    expect(command.canMerge).toBe(false);
  });
});
