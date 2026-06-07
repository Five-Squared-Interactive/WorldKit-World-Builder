/**
 * ReparentEntityCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReparentEntityCommand } from './ReparentEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('ReparentEntityCommand', () => {
  beforeEach(() => {
    // Reset scene store before each test
    useSceneStore.setState({ entities: {}, rootIds: [] });
  });

  it('should move entity into a group on execute', () => {
    const cube = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const group = createEntity('group-1', 'Group 1', EntityType.Group);
    useSceneStore.getState().addEntity(cube);
    useSceneStore.getState().addEntity(group);

    const command = new ReparentEntityCommand('cube-1', null, 'group-1', 0);
    command.execute();

    const updatedCube = useSceneStore.getState().entities['cube-1'];
    const updatedGroup = useSceneStore.getState().entities['group-1'];

    expect(updatedCube.parentId).toBe('group-1');
    expect(updatedGroup.childIds).toContain('cube-1');
    expect(useSceneStore.getState().rootIds).not.toContain('cube-1');
  });

  it('should move entity back to original parent on undo', () => {
    const cube = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const group = createEntity('group-1', 'Group 1', EntityType.Group);
    useSceneStore.getState().addEntity(cube);
    useSceneStore.getState().addEntity(group);

    const command = new ReparentEntityCommand('cube-1', null, 'group-1', 0);
    command.execute();
    command.undo();

    const updatedCube = useSceneStore.getState().entities['cube-1'];
    const updatedGroup = useSceneStore.getState().entities['group-1'];

    expect(updatedCube.parentId).toBeNull();
    expect(updatedGroup.childIds).not.toContain('cube-1');
    expect(useSceneStore.getState().rootIds).toContain('cube-1');
  });

  it('should move entity from one group to another', () => {
    const cube = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const group1 = createEntity('group-1', 'Group 1', EntityType.Group);
    const group2 = createEntity('group-2', 'Group 2', EntityType.Group);
    useSceneStore.getState().addEntity(group1);
    useSceneStore.getState().addEntity(group2);
    useSceneStore.getState().addEntity(cube, 'group-1');

    const command = new ReparentEntityCommand('cube-1', 'group-1', 'group-2', 0);
    command.execute();

    const updatedCube = useSceneStore.getState().entities['cube-1'];
    const updatedGroup1 = useSceneStore.getState().entities['group-1'];
    const updatedGroup2 = useSceneStore.getState().entities['group-2'];

    expect(updatedCube.parentId).toBe('group-2');
    expect(updatedGroup1.childIds).not.toContain('cube-1');
    expect(updatedGroup2.childIds).toContain('cube-1');
  });

  it('should move entity to root level', () => {
    const cube = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
    const group = createEntity('group-1', 'Group 1', EntityType.Group);
    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(cube, 'group-1');

    const command = new ReparentEntityCommand('cube-1', 'group-1', null, 0);
    command.execute();

    const updatedCube = useSceneStore.getState().entities['cube-1'];
    const updatedGroup = useSceneStore.getState().entities['group-1'];

    expect(updatedCube.parentId).toBeNull();
    expect(updatedGroup.childIds).not.toContain('cube-1');
    expect(useSceneStore.getState().rootIds).toContain('cube-1');
  });

  it('should have correct description when moving into group', () => {
    const group = createEntity('group-1', 'My Group', EntityType.Group);
    useSceneStore.getState().addEntity(group);

    const command = new ReparentEntityCommand('cube-1', null, 'group-1', 0);
    expect(command.description).toBe('Move into My Group');
  });

  it('should have correct description when moving to root', () => {
    const command = new ReparentEntityCommand('cube-1', 'group-1', null, 0);
    expect(command.description).toBe('Move to root');
  });

  it('should not be mergeable', () => {
    const command = new ReparentEntityCommand('cube-1', null, 'group-1', 0);
    expect(command.canMerge).toBe(false);
  });
});
