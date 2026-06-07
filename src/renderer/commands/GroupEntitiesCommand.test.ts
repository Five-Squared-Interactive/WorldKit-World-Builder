/**
 * GroupEntitiesCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GroupEntitiesCommand } from './GroupEntitiesCommand';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { createEntity, EntityType } from '../types/entity';

describe('GroupEntitiesCommand', () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
    useSelectionStore.getState().clearSelection();
  });

  it('should have correct description', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube);

    const command = new GroupEntitiesCommand(['cube-1']);
    expect(command.description).toBe('Group entities');
  });

  it('should not be mergeable', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube);

    const command = new GroupEntitiesCommand(['cube-1']);
    expect(command.canMerge).toBe(false);
  });

  it('should create group with entities as children on execute', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    const command = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    command.execute();

    const groupId = command.getGroupId();
    const group = useSceneStore.getState().getEntity(groupId);

    expect(group).toBeDefined();
    expect(group?.type).toBe(EntityType.Group);
    expect(group?.name).toBe('Group');
    expect(group?.childIds).toEqual(['cube-1', 'cube-2']);

    // Check that entities are now children of the group
    expect(useSceneStore.getState().getEntity('cube-1')?.parentId).toBe(groupId);
    expect(useSceneStore.getState().getEntity('cube-2')?.parentId).toBe(groupId);
  });

  it('should select the group after execute', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    const command = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    command.execute();

    const groupId = command.getGroupId();
    expect(useSelectionStore.getState().selectedIds).toEqual([groupId]);
  });

  it('should restore original state on undo', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    const command = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    command.execute();

    const groupId = command.getGroupId();
    expect(useSceneStore.getState().getEntity(groupId)).toBeDefined();

    command.undo();

    // Group should be removed
    expect(useSceneStore.getState().getEntity(groupId)).toBeUndefined();

    // Entities should be back at root level
    expect(useSceneStore.getState().getEntity('cube-1')?.parentId).toBeNull();
    expect(useSceneStore.getState().getEntity('cube-2')?.parentId).toBeNull();

    // Selection should be restored
    expect(useSelectionStore.getState().selectedIds).toEqual(['cube-1', 'cube-2']);
  });

  it('should generate unique group names', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);
    const cube3 = createEntity('cube-3', 'Cube 3', EntityType.CubeMesh);
    const cube4 = createEntity('cube-4', 'Cube 4', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);
    useSceneStore.getState().addEntity(cube3);
    useSceneStore.getState().addEntity(cube4);

    const command1 = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    command1.execute();

    const command2 = new GroupEntitiesCommand(['cube-3', 'cube-4']);
    command2.execute();

    const group1 = useSceneStore.getState().getEntity(command1.getGroupId());
    const group2 = useSceneStore.getState().getEntity(command2.getGroupId());

    expect(group1?.name).toBe('Group');
    expect(group2?.name).toBe('Group (1)');
  });

  it('should support nested groups', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    // Create first group
    const command1 = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    command1.execute();

    const group1Id = command1.getGroupId();

    // Add another cube
    const cube3 = createEntity('cube-3', 'Cube 3', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube3);

    // Create second group with first group inside
    const command2 = new GroupEntitiesCommand([group1Id, 'cube-3']);
    command2.execute();

    const group2Id = command2.getGroupId();
    const group2 = useSceneStore.getState().getEntity(group2Id);

    expect(group2?.childIds).toContain(group1Id);
    expect(group2?.childIds).toContain('cube-3');

    // Nested group should have group2 as parent
    expect(useSceneStore.getState().getEntity(group1Id)?.parentId).toBe(group2Id);
  });

  it('should work with multiple execute/undo cycles', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    const command = new GroupEntitiesCommand(['cube-1', 'cube-2']);

    command.execute();
    const groupId = command.getGroupId();
    expect(useSceneStore.getState().getEntity(groupId)).toBeDefined();

    command.undo();
    expect(useSceneStore.getState().getEntity(groupId)).toBeUndefined();

    command.execute();
    expect(useSceneStore.getState().getEntity(groupId)).toBeDefined();

    command.undo();
    expect(useSceneStore.getState().getEntity(groupId)).toBeUndefined();
  });
});
