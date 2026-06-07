/**
 * PasteEntitiesCommand Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PasteEntitiesCommand } from './PasteEntitiesCommand';
import { useSceneStore } from '../stores/sceneStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useClipboardStore } from '../stores/clipboardStore';
import { createEntity, EntityType } from '../types/entity';

describe('PasteEntitiesCommand', () => {
  beforeEach(() => {
    // Reset stores before each test
    useSceneStore.setState({ entities: {}, rootIds: [] });
    useSelectionStore.setState({ selectedIds: [] });
    useClipboardStore.setState({ clipboard: null });
  });

  it('should paste entity from clipboard with new ID', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useClipboardStore.getState().copyEntities(['entity-1']);

    // Remove original to verify paste creates new
    useSceneStore.getState().removeEntity('entity-1');

    const command = new PasteEntitiesCommand();
    command.execute();

    const entities = useSceneStore.getState().entities;
    const entityIds = Object.keys(entities);

    expect(entityIds).toHaveLength(1);
    expect(entityIds[0]).not.toBe('entity-1'); // New ID
    expect(entities[entityIds[0]].name).toBe('Cube 1');
  });

  it('should paste multiple entities', () => {
    const entity1 = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    const entity2 = createEntity('entity-2', 'Sphere 1', EntityType.SphereMesh);
    useSceneStore.getState().addEntity(entity1);
    useSceneStore.getState().addEntity(entity2);
    useClipboardStore.getState().copyEntities(['entity-1', 'entity-2']);

    useSceneStore.getState().clearScene();

    const command = new PasteEntitiesCommand();
    command.execute();

    const entities = useSceneStore.getState().entities;
    expect(Object.keys(entities)).toHaveLength(2);
  });

  it('should preserve hierarchy when pasting', () => {
    const group = createEntity('group-1', 'Group 1', EntityType.Group);
    const child = createEntity('child-1', 'Child Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(child, 'group-1');
    useClipboardStore.getState().copyEntities(['group-1']);

    useSceneStore.getState().clearScene();

    const command = new PasteEntitiesCommand();
    command.execute();

    const entities = useSceneStore.getState().entities;
    const entityIds = Object.keys(entities);

    expect(entityIds).toHaveLength(2);

    // Find the group
    const pastedGroup = Object.values(entities).find((e) => e.type === EntityType.Group);
    expect(pastedGroup).toBeDefined();
    expect(pastedGroup?.childIds).toHaveLength(1);

    // Find the child
    const pastedChild = Object.values(entities).find((e) => e.type === EntityType.CubeMesh);
    expect(pastedChild?.parentId).toBe(pastedGroup?.id);
  });

  it('should select pasted entities', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useClipboardStore.getState().copyEntities(['entity-1']);

    const command = new PasteEntitiesCommand();
    command.execute();

    const selectedIds = useSelectionStore.getState().selectedIds;
    expect(selectedIds).toHaveLength(1);
    expect(selectedIds[0]).not.toBe('entity-1'); // New ID selected
  });

  it('should remove pasted entities on undo', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useClipboardStore.getState().copyEntities(['entity-1']);

    const initialCount = Object.keys(useSceneStore.getState().entities).length;

    const command = new PasteEntitiesCommand();
    command.execute();

    expect(Object.keys(useSceneStore.getState().entities).length).toBe(initialCount + 1);

    command.undo();

    expect(Object.keys(useSceneStore.getState().entities).length).toBe(initialCount);
  });

  it('should offset pasted entities position', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh, {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });
    useSceneStore.getState().addEntity(entity);
    useClipboardStore.getState().copyEntities(['entity-1']);

    useSceneStore.getState().clearScene();

    const command = new PasteEntitiesCommand();
    command.execute();

    const entities = useSceneStore.getState().entities;
    const pasted = Object.values(entities)[0];

    // Should be offset from original position
    expect(pasted.transform.position.x).toBeGreaterThan(0);
    expect(pasted.transform.position.z).toBeGreaterThan(0);
  });

  it('should clear clipboard after paste if it was a cut operation', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useClipboardStore.getState().setForCut(['entity-1']);

    // Simulate cut by removing entity
    useSceneStore.getState().removeEntity('entity-1');

    const command = new PasteEntitiesCommand();
    command.execute();

    // Clipboard should be cleared
    expect(useClipboardStore.getState().clipboard).toBeNull();
  });

  it('should preserve clipboard after paste if it was a copy operation', () => {
    const entity = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useClipboardStore.getState().copyEntities(['entity-1']);

    const command = new PasteEntitiesCommand();
    command.execute();

    // Clipboard should still have content
    expect(useClipboardStore.getState().clipboard).not.toBeNull();
  });

  it('should do nothing if clipboard is empty', () => {
    const command = new PasteEntitiesCommand();
    command.execute();

    expect(Object.keys(useSceneStore.getState().entities)).toHaveLength(0);
  });

  it('should have correct description', () => {
    const command = new PasteEntitiesCommand();
    expect(command.description).toBe('Paste');
  });

  it('should not be mergeable', () => {
    const command = new PasteEntitiesCommand();
    expect(command.canMerge).toBe(false);
  });
});
