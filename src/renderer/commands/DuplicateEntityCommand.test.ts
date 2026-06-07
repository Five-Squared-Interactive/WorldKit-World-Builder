/**
 * DuplicateEntityCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DuplicateEntityCommand } from './DuplicateEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { createEntity, EntityType } from '../types/entity';

describe('DuplicateEntityCommand', () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
    useSelectionStore.getState().clearSelection();
  });

  it('should have correct description for single entity', () => {
    const command = new DuplicateEntityCommand(['entity-1']);
    expect(command.description).toBe('Duplicate entity');
  });

  it('should have correct description for multiple entities', () => {
    const command = new DuplicateEntityCommand(['entity-1', 'entity-2', 'entity-3']);
    expect(command.description).toBe('Duplicate 3 entities');
  });

  it('should create a copy of the entity on execute', () => {
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    const entities = useSceneStore.getState().entities;
    const entityIds = Object.keys(entities);

    expect(entityIds.length).toBe(2);
  });

  it('should offset duplicated entity position', () => {
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh, {
      transform: {
        position: { x: 5, y: 10, z: 15 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    const entities = useSceneStore.getState().entities;
    const duplicatedEntity = Object.values(entities).find((e) => e.id !== 'entity-1');

    expect(duplicatedEntity?.transform.position).toEqual({ x: 6, y: 10, z: 16 });
  });

  it('should add " Copy" suffix to name', () => {
    const entity = createEntity('entity-1', 'My Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    const entities = useSceneStore.getState().entities;
    const duplicatedEntity = Object.values(entities).find((e) => e.id !== 'entity-1');

    expect(duplicatedEntity?.name).toBe('My Cube Copy');
  });

  it('should preserve entity type', () => {
    const entity = createEntity('entity-1', 'Test Sphere', EntityType.SphereMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    const entities = useSceneStore.getState().entities;
    const duplicatedEntity = Object.values(entities).find((e) => e.id !== 'entity-1');

    expect(duplicatedEntity?.type).toBe(EntityType.SphereMesh);
  });

  it('should preserve rotation and scale', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh, {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0.5, y: 0.5, z: 0.5, w: 0.5 },
        scale: { x: 2, y: 3, z: 4 },
      },
    });
    useSceneStore.getState().addEntity(entity);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    const entities = useSceneStore.getState().entities;
    const duplicatedEntity = Object.values(entities).find((e) => e.id !== 'entity-1');

    expect(duplicatedEntity?.transform.rotation).toEqual({ x: 0.5, y: 0.5, z: 0.5, w: 0.5 });
    expect(duplicatedEntity?.transform.scale).toEqual({ x: 2, y: 3, z: 4 });
  });

  it('should select duplicated entities', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    const selectedIds = useSelectionStore.getState().selectedIds;
    expect(selectedIds.length).toBe(1);
    expect(selectedIds[0]).not.toBe('entity-1'); // Should be the new entity
  });

  it('should duplicate multiple entities', () => {
    const entity1 = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    const entity2 = createEntity('entity-2', 'Cube 2', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity1);
    useSceneStore.getState().addEntity(entity2);

    const command = new DuplicateEntityCommand(['entity-1', 'entity-2']);
    command.execute();

    const entities = useSceneStore.getState().entities;
    expect(Object.keys(entities).length).toBe(4);
  });

  it('should remove duplicated entities on undo', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    expect(Object.keys(useSceneStore.getState().entities).length).toBe(2);

    command.undo();

    expect(Object.keys(useSceneStore.getState().entities).length).toBe(1);
    expect(useSceneStore.getState().entities['entity-1']).toBeDefined();
  });

  it('should restore previous selection on undo', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    // Selection should be the duplicate now
    expect(useSelectionStore.getState().selectedIds[0]).not.toBe('entity-1');

    command.undo();

    // Selection should be restored to original
    expect(useSelectionStore.getState().selectedIds).toEqual(['entity-1']);
  });

  it('should handle duplicating non-existent entity gracefully', () => {
    const command = new DuplicateEntityCommand(['non-existent']);

    expect(() => command.execute()).not.toThrow();
    expect(Object.keys(useSceneStore.getState().entities).length).toBe(0);
  });

  it('should not be mergeable', () => {
    const command = new DuplicateEntityCommand(['entity-1']);
    expect(command.canMerge).toBe(false);
  });

  it('should generate unique IDs for duplicates', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new DuplicateEntityCommand(['entity-1']);
    command.execute();

    const entityIds = Object.keys(useSceneStore.getState().entities);
    const uniqueIds = new Set(entityIds);

    expect(uniqueIds.size).toBe(entityIds.length);
  });
});
