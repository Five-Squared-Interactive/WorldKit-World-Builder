/**
 * RotateEntityCommand Tests
 *
 * Tests for the RotateEntityCommand class.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RotateEntityCommand } from './RotateEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('RotateEntityCommand', () => {
  beforeEach(() => {
    // Clear scene before each test
    useSceneStore.getState().clearScene();
  });

  it('should have correct description', () => {
    const command = new RotateEntityCommand(
      'test-entity',
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }
    );

    expect(command.description).toBe('Rotate entity');
  });

  it('should have canMerge set to false', () => {
    const command = new RotateEntityCommand(
      'test-entity',
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }
    );

    expect(command.canMerge).toBe(false);
  });

  it('should update entity rotation on execute', () => {
    // Add an entity to the store
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    // Create and execute command
    const command = new RotateEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0.707, y: 0, z: 0, w: 0.707 } // 90 degrees around X axis
    );
    command.execute();

    // Verify rotation was updated
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.rotation).toEqual({ x: 0.707, y: 0, z: 0, w: 0.707 });
  });

  it('should restore old rotation on undo', () => {
    // Add an entity with initial rotation
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh, {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    // Create command and execute
    const command = new RotateEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }
    );
    command.execute();

    // Verify new rotation
    expect(useSceneStore.getState().entities['entity-1'].transform.rotation).toEqual({
      x: 0.5,
      y: 0.5,
      z: 0.5,
      w: 0.5,
    });

    // Undo
    command.undo();

    // Verify old rotation is restored
    expect(useSceneStore.getState().entities['entity-1'].transform.rotation).toEqual({
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    });
  });

  it('should handle execute after undo (redo behavior)', () => {
    // Add an entity
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new RotateEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0, y: 0.707, z: 0, w: 0.707 } // 90 degrees around Y axis
    );

    // Execute -> Undo -> Execute (redo)
    command.execute();
    expect(useSceneStore.getState().entities['entity-1'].transform.rotation).toEqual({
      x: 0,
      y: 0.707,
      z: 0,
      w: 0.707,
    });

    command.undo();
    expect(useSceneStore.getState().entities['entity-1'].transform.rotation).toEqual({
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    });

    command.execute(); // Redo
    expect(useSceneStore.getState().entities['entity-1'].transform.rotation).toEqual({
      x: 0,
      y: 0.707,
      z: 0,
      w: 0.707,
    });
  });

  it('should not affect other transform properties on execute', () => {
    // Add an entity with specific position and scale
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh, {
      transform: {
        position: { x: 5, y: 10, z: 15 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 2, y: 2, z: 2 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    // Rotate entity
    const command = new RotateEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0, y: 0, z: 0.707, w: 0.707 } // 90 degrees around Z axis
    );
    command.execute();

    // Verify position and scale are unchanged
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.position).toEqual({ x: 5, y: 10, z: 15 });
    expect(updatedEntity.transform.scale).toEqual({ x: 2, y: 2, z: 2 });
  });

  it('should handle non-existent entity gracefully', () => {
    // Try to rotate an entity that doesn't exist
    const command = new RotateEntityCommand(
      'non-existent',
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }
    );

    // Should not throw
    expect(() => command.execute()).not.toThrow();
    expect(() => command.undo()).not.toThrow();
  });

  it('should preserve quaternion values exactly', () => {
    // Add an entity
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    // Use specific quaternion values (45 degrees around X axis)
    const newRotation = { x: 0.3826834, y: 0, z: 0, w: 0.9238795 };

    const command = new RotateEntityCommand(
      'entity-1',
      { x: 0, y: 0, z: 0, w: 1 },
      newRotation
    );
    command.execute();

    // Verify exact values are preserved
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.rotation.x).toBeCloseTo(0.3826834, 5);
    expect(updatedEntity.transform.rotation.y).toBeCloseTo(0, 5);
    expect(updatedEntity.transform.rotation.z).toBeCloseTo(0, 5);
    expect(updatedEntity.transform.rotation.w).toBeCloseTo(0.9238795, 5);
  });
});
