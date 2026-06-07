/**
 * CutEntitiesCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CutEntitiesCommand } from './CutEntitiesCommand';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useClipboardStore } from '../stores/clipboardStore';
import { createEntity, EntityType } from '../types/entity';

describe('CutEntitiesCommand', () => {
  beforeEach(() => {
    // Reset stores before each test
    useSceneStore.setState({ entities: {}, rootIds: [] });
    useSelectionStore.setState({ selectedIds: [] });
    useClipboardStore.setState({ clipboard: null });
  });

  it('should cut entity and add to clipboard on execute', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    const command = new CutEntitiesCommand(['entity-1']);
    command.execute();

    // Entity should be removed from scene
    expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
    expect(useSceneStore.getState().rootIds).not.toContain('entity-1');

    // Entity should be in clipboard
    const clipboard = useClipboardStore.getState().clipboard;
    expect(clipboard).not.toBeNull();
    expect(clipboard?.operation).toBe('cut');
    expect(clipboard?.entities).toHaveLength(1);
    expect(clipboard?.entities[0].entity.name).toBe('Cube 1');

    // Selection should be cleared
    expect(useSelectionStore.getState().selectedIds).not.toContain('entity-1');
  });

  it('should restore entity and clear clipboard on undo', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    const command = new CutEntitiesCommand(['entity-1']);
    command.execute();
    command.undo();

    // Entity should be restored
    expect(useSceneStore.getState().entities['entity-1']).toBeDefined();
    expect(useSceneStore.getState().entities['entity-1'].name).toBe('Cube 1');

    // Selection should be restored
    expect(useSelectionStore.getState().selectedIds).toContain('entity-1');
  });

  it('should cut multiple entities', () => {
    const entity1 = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    const entity2 = createEntity('entity-2', 'Sphere 1', EntityType.SphereMesh);
    useSceneStore.getState().addEntity(entity1);
    useSceneStore.getState().addEntity(entity2);

    const command = new CutEntitiesCommand(['entity-1', 'entity-2']);
    command.execute();

    expect(useSceneStore.getState().entities['entity-1']).toBeUndefined();
    expect(useSceneStore.getState().entities['entity-2']).toBeUndefined();

    const clipboard = useClipboardStore.getState().clipboard;
    expect(clipboard?.entities).toHaveLength(2);
  });

  it('should cut entity with children', () => {
    const group = createEntity('group-1', 'Group 1', EntityType.Group);
    const child = createEntity('child-1', 'Child Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(child, 'group-1');

    const command = new CutEntitiesCommand(['group-1']);
    command.execute();

    // Both parent and child should be removed
    expect(useSceneStore.getState().entities['group-1']).toBeUndefined();
    expect(useSceneStore.getState().entities['child-1']).toBeUndefined();

    // Both should be in clipboard
    const clipboard = useClipboardStore.getState().clipboard;
    expect(clipboard?.entities).toHaveLength(2);
  });

  it('should have correct description for single entity', () => {
    const command = new CutEntitiesCommand(['entity-1']);
    expect(command.description).toBe('Cut entity');
  });

  it('should have correct description for multiple entities', () => {
    const command = new CutEntitiesCommand(['entity-1', 'entity-2', 'entity-3']);
    expect(command.description).toBe('Cut 3 entities');
  });

  it('should not be mergeable', () => {
    const command = new CutEntitiesCommand(['entity-1']);
    expect(command.canMerge).toBe(false);
  });
});
