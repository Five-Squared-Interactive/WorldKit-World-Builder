// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * MoveEntityCommand Tests
 *
 * Tests for the MoveEntityCommand class.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MoveEntityCommand } from './MoveEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('MoveEntityCommand', () => {
  beforeEach(() => {
    // Clear scene before each test
    useSceneStore.getState().clearScene();
  });

  it('should have correct description', () => {
    const command = new MoveEntityCommand(
      'test-entity',
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 2, z: 3 }
    );

    expect(command.description).toBe('Move entity');
  });

  it('should have canMerge set to false', () => {
    const command = new MoveEntityCommand(
      'test-entity',
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 2, z: 3 }
    );

    expect(command.canMerge).toBe(false);
  });

  it('should update entity position on execute', () => {
    // Add an entity to the store
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    // Create and execute command
    const command = new MoveEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 10, z: 15 }
    );
    command.execute();

    // Verify position was updated
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.position).toEqual({ x: 5, y: 10, z: 15 });
  });

  it('should restore old position on undo', () => {
    // Add an entity with initial position
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh, {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    // Create command and execute
    const command = new MoveEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 10, z: 15 }
    );
    command.execute();

    // Verify new position
    expect(useSceneStore.getState().entities['entity-1'].transform.position).toEqual({
      x: 5,
      y: 10,
      z: 15,
    });

    // Undo
    command.undo();

    // Verify old position is restored
    expect(useSceneStore.getState().entities['entity-1'].transform.position).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });
  });

  it('should handle execute after undo (redo behavior)', () => {
    // Add an entity
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new MoveEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 6, z: 9 }
    );

    // Execute -> Undo -> Execute (redo)
    command.execute();
    expect(useSceneStore.getState().entities['entity-1'].transform.position).toEqual({
      x: 3,
      y: 6,
      z: 9,
    });

    command.undo();
    expect(useSceneStore.getState().entities['entity-1'].transform.position).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });

    command.execute(); // Redo
    expect(useSceneStore.getState().entities['entity-1'].transform.position).toEqual({
      x: 3,
      y: 6,
      z: 9,
    });
  });

  it('should not affect other transform properties on execute', () => {
    // Add an entity with specific rotation and scale
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh, {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0.5, y: 0.5, z: 0.5, w: 0.5 },
        scale: { x: 2, y: 2, z: 2 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    // Move entity
    const command = new MoveEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 }
    );
    command.execute();

    // Verify rotation and scale are unchanged
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.rotation).toEqual({ x: 0.5, y: 0.5, z: 0.5, w: 0.5 });
    expect(updatedEntity.transform.scale).toEqual({ x: 2, y: 2, z: 2 });
  });

  it('should handle non-existent entity gracefully', () => {
    // Try to move an entity that doesn't exist
    const command = new MoveEntityCommand(
      'non-existent',
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 }
    );

    // Should not throw
    expect(() => command.execute()).not.toThrow();
    expect(() => command.undo()).not.toThrow();
  });
});
