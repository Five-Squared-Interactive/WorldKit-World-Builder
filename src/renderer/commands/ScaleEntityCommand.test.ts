/**
 * ScaleEntityCommand Tests
 *
 * Tests for the ScaleEntityCommand class.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScaleEntityCommand } from './ScaleEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('ScaleEntityCommand', () => {
  beforeEach(() => {
    // Clear scene before each test
    useSceneStore.getState().clearScene();
  });

  it('should have correct description', () => {
    const command = new ScaleEntityCommand(
      'test-entity',
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 2, z: 2 }
    );

    expect(command.description).toBe('Scale entity');
  });

  it('should have canMerge set to false', () => {
    const command = new ScaleEntityCommand(
      'test-entity',
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 2, z: 2 }
    );

    expect(command.canMerge).toBe(false);
  });

  it('should update entity scale on execute', () => {
    // Add an entity to the store
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    // Create and execute command
    const command = new ScaleEntityCommand(
      'entity-1',
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 3, z: 4 }
    );
    command.execute();

    // Verify scale was updated
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.scale).toEqual({ x: 2, y: 3, z: 4 });
  });

  it('should restore old scale on undo', () => {
    // Add an entity with initial scale
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh, {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    // Create command and execute
    const command = new ScaleEntityCommand(
      'entity-1',
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 2, z: 2 }
    );
    command.execute();

    // Verify new scale
    expect(useSceneStore.getState().entities['entity-1'].transform.scale).toEqual({
      x: 2,
      y: 2,
      z: 2,
    });

    // Undo
    command.undo();

    // Verify old scale is restored
    expect(useSceneStore.getState().entities['entity-1'].transform.scale).toEqual({
      x: 1,
      y: 1,
      z: 1,
    });
  });

  it('should handle execute after undo (redo behavior)', () => {
    // Add an entity
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new ScaleEntityCommand(
      'entity-1',
      { x: 1, y: 1, z: 1 },
      { x: 0.5, y: 2, z: 1.5 }
    );

    // Execute -> Undo -> Execute (redo)
    command.execute();
    expect(useSceneStore.getState().entities['entity-1'].transform.scale).toEqual({
      x: 0.5,
      y: 2,
      z: 1.5,
    });

    command.undo();
    expect(useSceneStore.getState().entities['entity-1'].transform.scale).toEqual({
      x: 1,
      y: 1,
      z: 1,
    });

    command.execute(); // Redo
    expect(useSceneStore.getState().entities['entity-1'].transform.scale).toEqual({
      x: 0.5,
      y: 2,
      z: 1.5,
    });
  });

  it('should not affect other transform properties on execute', () => {
    // Add an entity with specific position and rotation
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh, {
      transform: {
        position: { x: 5, y: 10, z: 15 },
        rotation: { x: 0.5, y: 0.5, z: 0.5, w: 0.5 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    // Scale entity
    const command = new ScaleEntityCommand(
      'entity-1',
      { x: 1, y: 1, z: 1 },
      { x: 3, y: 3, z: 3 }
    );
    command.execute();

    // Verify position and rotation are unchanged
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.position).toEqual({ x: 5, y: 10, z: 15 });
    expect(updatedEntity.transform.rotation).toEqual({ x: 0.5, y: 0.5, z: 0.5, w: 0.5 });
  });

  it('should handle non-existent entity gracefully', () => {
    // Try to scale an entity that doesn't exist
    const command = new ScaleEntityCommand(
      'non-existent',
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 2, z: 2 }
    );

    // Should not throw
    expect(() => command.execute()).not.toThrow();
    expect(() => command.undo()).not.toThrow();
  });

  it('should handle non-uniform scaling', () => {
    // Add an entity
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    // Non-uniform scale (different values for each axis)
    const command = new ScaleEntityCommand(
      'entity-1',
      { x: 1, y: 1, z: 1 },
      { x: 2, y: 0.5, z: 3 }
    );
    command.execute();

    // Verify non-uniform scale values
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.scale.x).toBe(2);
    expect(updatedEntity.transform.scale.y).toBe(0.5);
    expect(updatedEntity.transform.scale.z).toBe(3);
  });
});
