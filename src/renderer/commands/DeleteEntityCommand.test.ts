/**
 * DeleteEntityCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteEntityCommand } from './DeleteEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { createEntity, EntityType } from '../types/entity';

describe('DeleteEntityCommand', () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
    useSelectionStore.getState().clearSelection();
  });

  it('should have correct description for single entity', () => {
    const command = new DeleteEntityCommand(['entity-1']);
    expect(command.description).toBe('Delete entity');
  });

  it('should have correct description for multiple entities', () => {
    const command = new DeleteEntityCommand(['entity-1', 'entity-2', 'entity-3']);
    expect(command.description).toBe('Delete 3 entities');
  });

  it('should delete entity on execute', () => {
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    expect(useSceneStore.getState().entities['entity-1']).toBeDefined();

    const command = new DeleteEntityCommand(['entity-1']);
    command.execute();

    expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
  });

  it('should delete multiple entities on execute', () => {
    const entity1 = createEntity('entity-1', 'Entity 1', EntityType.CubeMesh);
    const entity2 = createEntity('entity-2', 'Entity 2', EntityType.SphereMesh);
    useSceneStore.getState().addEntity(entity1);
    useSceneStore.getState().addEntity(entity2);

    const command = new DeleteEntityCommand(['entity-1', 'entity-2']);
    command.execute();

    expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
    expect(useSceneStore.getState().entities['entity-2']).toBeUndefined();
  });

  it('should remove deleted entities from selection', () => {
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    expect(useSelectionStore.getState().selectedIds).toContain('entity-1');

    const command = new DeleteEntityCommand(['entity-1']);
    command.execute();

    expect(useSelectionStore.getState().selectedIds).not.toContain('entity-1');
  });

  it('should restore entity on undo', () => {
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new DeleteEntityCommand(['entity-1']);
    command.execute();

    expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();

    command.undo();

    const restored = useSceneStore.getState().entities['entity-1'];
    expect(restored).toBeDefined();
    expect(restored?.name).toBe('Test Entity');
    expect(restored?.type).toBe(EntityType.CubeMesh);
  });

  it('should restore selection on undo', () => {
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    const command = new DeleteEntityCommand(['entity-1']);
    command.execute();

    expect(useSelectionStore.getState().selectedIds).not.toContain('entity-1');

    command.undo();

    expect(useSelectionStore.getState().selectedIds).toContain('entity-1');
  });

  it('should restore transform values on undo', () => {
    const entity = createEntity('entity-1', 'Test Entity', EntityType.CubeMesh, {
      transform: {
        position: { x: 5, y: 10, z: 15 },
        rotation: { x: 0.5, y: 0.5, z: 0.5, w: 0.5 },
        scale: { x: 2, y: 3, z: 4 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    const command = new DeleteEntityCommand(['entity-1']);
    command.execute();
    command.undo();

    const restored = useSceneStore.getState().entities['entity-1'];
    expect(restored?.transform.position).toEqual({ x: 5, y: 10, z: 15 });
    expect(restored?.transform.scale).toEqual({ x: 2, y: 3, z: 4 });
  });

  it('should handle deleting non-existent entity gracefully', () => {
    const command = new DeleteEntityCommand(['non-existent']);

    // Should not throw
    expect(() => command.execute()).not.toThrow();
  });

  it('should not be mergeable', () => {
    const command = new DeleteEntityCommand(['entity-1']);
    expect(command.canMerge).toBe(false);
  });
});
