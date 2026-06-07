/**
 * ReorderEntityCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReorderEntityCommand } from './ReorderEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('ReorderEntityCommand', () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
  });

  it('should have correct description', () => {
    const command = new ReorderEntityCommand('entity-1', 0, 1);
    expect(command.description).toBe('Reorder entity');
  });

  it('should not be mergeable', () => {
    const command = new ReorderEntityCommand('entity-1', 0, 1);
    expect(command.canMerge).toBe(false);
  });

  it('should reorder root entity on execute', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);
    const cube3 = createEntity('cube-3', 'Cube 3', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);
    useSceneStore.getState().addEntity(cube3);

    expect(useSceneStore.getState().rootIds).toEqual(['cube-1', 'cube-2', 'cube-3']);

    // Move cube-1 to position 2
    const command = new ReorderEntityCommand('cube-1', 0, 2);
    command.execute();

    expect(useSceneStore.getState().rootIds).toEqual(['cube-2', 'cube-3', 'cube-1']);
  });

  it('should restore order on undo', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);
    const cube3 = createEntity('cube-3', 'Cube 3', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);
    useSceneStore.getState().addEntity(cube3);

    const command = new ReorderEntityCommand('cube-1', 0, 2);
    command.execute();

    expect(useSceneStore.getState().rootIds).toEqual(['cube-2', 'cube-3', 'cube-1']);

    command.undo();

    expect(useSceneStore.getState().rootIds).toEqual(['cube-1', 'cube-2', 'cube-3']);
  });

  it('should reorder child entity within parent', () => {
    const group = createEntity('group-1', 'Group', EntityType.Group);
    const child1 = createEntity('child-1', 'Child 1', EntityType.CubeMesh);
    const child2 = createEntity('child-2', 'Child 2', EntityType.CubeMesh);
    const child3 = createEntity('child-3', 'Child 3', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(child1, 'group-1');
    useSceneStore.getState().addEntity(child2, 'group-1');
    useSceneStore.getState().addEntity(child3, 'group-1');

    expect(useSceneStore.getState().getEntity('group-1')?.childIds).toEqual([
      'child-1',
      'child-2',
      'child-3',
    ]);

    // Move child-3 to position 0
    const command = new ReorderEntityCommand('child-3', 2, 0);
    command.execute();

    expect(useSceneStore.getState().getEntity('group-1')?.childIds).toEqual([
      'child-3',
      'child-1',
      'child-2',
    ]);
  });

  it('should work with multiple execute/undo cycles', () => {
    const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(cube1);
    useSceneStore.getState().addEntity(cube2);

    const command = new ReorderEntityCommand('cube-2', 1, 0);

    command.execute();
    expect(useSceneStore.getState().rootIds).toEqual(['cube-2', 'cube-1']);

    command.undo();
    expect(useSceneStore.getState().rootIds).toEqual(['cube-1', 'cube-2']);

    command.execute();
    expect(useSceneStore.getState().rootIds).toEqual(['cube-2', 'cube-1']);

    command.undo();
    expect(useSceneStore.getState().rootIds).toEqual(['cube-1', 'cube-2']);
  });
});
