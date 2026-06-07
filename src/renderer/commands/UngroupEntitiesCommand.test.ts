/**
 * UngroupEntitiesCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UngroupEntitiesCommand } from './UngroupEntitiesCommand';
import { GroupEntitiesCommand } from './GroupEntitiesCommand';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { createEntity, EntityType } from '../types/entity';

describe('UngroupEntitiesCommand', () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
    useSelectionStore.getState().clearSelection();
  });

  it('should have correct description', () => {
    const group = createEntity('group-1', 'Group', EntityType.Group);
    useSceneStore.getState().addEntity(group);

    const command = new UngroupEntitiesCommand('group-1');
    expect(command.description).toBe('Ungroup entities');
  });

  it('should not be mergeable', () => {
    const group = createEntity('group-1', 'Group', EntityType.Group);
    useSceneStore.getState().addEntity(group);

    const command = new UngroupEntitiesCommand('group-1');
    expect(command.canMerge).toBe(false);
  });

  it('should move children to parent level on execute', () => {
    // Create a group with children
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    // Group the entities
    const groupCommand = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    groupCommand.execute();

    const groupId = groupCommand.getGroupId();

    // Ungroup
    const ungroupCommand = new UngroupEntitiesCommand(groupId);
    ungroupCommand.execute();

    // Group should be removed
    expect(useSceneStore.getState().getEntity(groupId)).toBeUndefined();

    // Children should be at root level
    expect(useSceneStore.getState().getEntity('cube-1')?.parentId).toBeNull();
    expect(useSceneStore.getState().getEntity('cube-2')?.parentId).toBeNull();
    expect(useSceneStore.getState().rootIds).toContain('cube-1');
    expect(useSceneStore.getState().rootIds).toContain('cube-2');
  });

  it('should select children after ungrouping', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    const groupCommand = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    groupCommand.execute();

    const groupId = groupCommand.getGroupId();

    const ungroupCommand = new UngroupEntitiesCommand(groupId);
    ungroupCommand.execute();

    expect(useSelectionStore.getState().selectedIds).toContain('cube-1');
    expect(useSelectionStore.getState().selectedIds).toContain('cube-2');
  });

  it('should restore group on undo', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    const groupCommand = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    groupCommand.execute();

    const groupId = groupCommand.getGroupId();

    const ungroupCommand = new UngroupEntitiesCommand(groupId);
    ungroupCommand.execute();

    expect(useSceneStore.getState().getEntity(groupId)).toBeUndefined();

    ungroupCommand.undo();

    // Group should be restored
    const group = useSceneStore.getState().getEntity(groupId);
    expect(group).toBeDefined();
    expect(group?.type).toBe(EntityType.Group);
    expect(group?.childIds).toContain('cube-1');
    expect(group?.childIds).toContain('cube-2');

    // Children should be back in the group
    expect(useSceneStore.getState().getEntity('cube-1')?.parentId).toBe(groupId);
    expect(useSceneStore.getState().getEntity('cube-2')?.parentId).toBe(groupId);

    // Group should be selected
    expect(useSelectionStore.getState().selectedIds).toEqual([groupId]);
  });

  it('should not execute for non-group entities', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube);

    const command = new UngroupEntitiesCommand('cube-1');
    expect(command.canExecute()).toBe(false);

    command.execute();

    // Cube should still exist
    expect(useSceneStore.getState().getEntity('cube-1')).toBeDefined();
  });

  it('should handle nested groups', () => {
    // Create outer group with inner group and a cube
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);
    const cube3 = createEntity('cube-3', 'Cube 3', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);
    useSceneStore.getState().addEntity(cube3);

    // Create inner group
    const innerGroupCommand = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    innerGroupCommand.execute();
    const innerGroupId = innerGroupCommand.getGroupId();

    // Create outer group
    const outerGroupCommand = new GroupEntitiesCommand([innerGroupId, 'cube-3']);
    outerGroupCommand.execute();
    const outerGroupId = outerGroupCommand.getGroupId();

    // Ungroup outer group
    const ungroupCommand = new UngroupEntitiesCommand(outerGroupId);
    ungroupCommand.execute();

    // Outer group should be removed
    expect(useSceneStore.getState().getEntity(outerGroupId)).toBeUndefined();

    // Inner group and cube3 should be at root level
    expect(useSceneStore.getState().getEntity(innerGroupId)?.parentId).toBeNull();
    expect(useSceneStore.getState().getEntity('cube-3')?.parentId).toBeNull();

    // Inner group should still contain its children
    expect(useSceneStore.getState().getEntity(innerGroupId)?.childIds).toContain('cube-1');
    expect(useSceneStore.getState().getEntity(innerGroupId)?.childIds).toContain('cube-2');
  });

  it('should work with multiple execute/undo cycles', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    const groupCommand = new GroupEntitiesCommand(['cube-1', 'cube-2']);
    groupCommand.execute();

    const groupId = groupCommand.getGroupId();

    const ungroupCommand = new UngroupEntitiesCommand(groupId);

    ungroupCommand.execute();
    expect(useSceneStore.getState().getEntity(groupId)).toBeUndefined();

    ungroupCommand.undo();
    expect(useSceneStore.getState().getEntity(groupId)).toBeDefined();

    ungroupCommand.execute();
    expect(useSceneStore.getState().getEntity(groupId)).toBeUndefined();

    ungroupCommand.undo();
    expect(useSceneStore.getState().getEntity(groupId)).toBeDefined();
  });
});
