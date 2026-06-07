/**
 * ChangeColorCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeColorCommand } from './ChangeColorCommand';
import { useSceneStore } from '../stores/sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('ChangeColorCommand', () => {
  beforeEach(() => {
    // Reset scene store before each test
    useSceneStore.setState({ entities: {}, rootIds: [] });
  });

  it('should change entity color on execute', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new ChangeColorCommand('entity-1', undefined, '#ff0000');
    command.execute();

    const updated = useSceneStore.getState().entities['entity-1'];
    expect(updated.color).toBe('#ff0000');
  });

  it('should restore previous color on undo', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh, {
      color: '#00ff00',
    });
    useSceneStore.getState().addEntity(entity);

    const command = new ChangeColorCommand('entity-1', '#00ff00', '#ff0000');
    command.execute();

    expect(useSceneStore.getState().entities['entity-1'].color).toBe('#ff0000');

    command.undo();

    expect(useSceneStore.getState().entities['entity-1'].color).toBe('#00ff00');
  });

  it('should restore undefined color on undo when there was no previous color', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new ChangeColorCommand('entity-1', undefined, '#ff0000');
    command.execute();
    command.undo();

    expect(useSceneStore.getState().entities['entity-1'].color).toBeUndefined();
  });

  it('should have correct description', () => {
    const command = new ChangeColorCommand('entity-1', '#000000', '#ff0000');
    expect(command.description).toBe('Change color to #ff0000');
  });

  it('should not be mergeable', () => {
    const command = new ChangeColorCommand('entity-1', undefined, '#ff0000');
    expect(command.canMerge).toBe(false);
  });
});
