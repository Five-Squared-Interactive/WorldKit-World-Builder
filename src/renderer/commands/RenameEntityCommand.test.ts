/**
 * RenameEntityCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RenameEntityCommand } from './RenameEntityCommand';
import { useSceneStore } from '../stores/sceneStore';
import { createEntity, EntityType } from '../types/entity';

describe('RenameEntityCommand', () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
  });

  it('should have correct description', () => {
    const command = new RenameEntityCommand('entity-1', 'Old Name', 'New Name');
    expect(command.description).toBe('Rename to "New Name"');
  });

  it('should not be mergeable', () => {
    const command = new RenameEntityCommand('entity-1', 'Old Name', 'New Name');
    expect(command.canMerge).toBe(false);
  });

  it('should rename entity on execute', () => {
    const entity = createEntity('entity-1', 'Old Name', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new RenameEntityCommand('entity-1', 'Old Name', 'New Name');
    command.execute();

    const updated = useSceneStore.getState().getEntity('entity-1');
    expect(updated?.name).toBe('New Name');
  });

  it('should restore old name on undo', () => {
    const entity = createEntity('entity-1', 'Old Name', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new RenameEntityCommand('entity-1', 'Old Name', 'New Name');
    command.execute();

    expect(useSceneStore.getState().getEntity('entity-1')?.name).toBe('New Name');

    command.undo();

    expect(useSceneStore.getState().getEntity('entity-1')?.name).toBe('Old Name');
  });

  it('should work with multiple execute/undo cycles', () => {
    const entity = createEntity('entity-1', 'Original', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const command = new RenameEntityCommand('entity-1', 'Original', 'Changed');

    command.execute();
    expect(useSceneStore.getState().getEntity('entity-1')?.name).toBe('Changed');

    command.undo();
    expect(useSceneStore.getState().getEntity('entity-1')?.name).toBe('Original');

    command.execute();
    expect(useSceneStore.getState().getEntity('entity-1')?.name).toBe('Changed');

    command.undo();
    expect(useSceneStore.getState().getEntity('entity-1')?.name).toBe('Original');
  });

  it('should handle special characters in name', () => {
    const entity = createEntity('entity-1', 'Name', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const specialName = 'Object <with> "special" & characters!';
    const command = new RenameEntityCommand('entity-1', 'Name', specialName);
    command.execute();

    expect(useSceneStore.getState().getEntity('entity-1')?.name).toBe(specialName);
  });

  it('should handle unicode characters in name', () => {
    const entity = createEntity('entity-1', 'Name', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const unicodeName = '立方体 🎲';
    const command = new RenameEntityCommand('entity-1', 'Name', unicodeName);
    command.execute();

    expect(useSceneStore.getState().getEntity('entity-1')?.name).toBe(unicodeName);
  });
});
