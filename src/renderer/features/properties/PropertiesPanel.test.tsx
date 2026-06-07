/**
 * PropertiesPanel Tests
 *
 * Tests for the PropertiesPanel component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useSelectionStore } from '../../stores/selectionStore';
import { useSceneStore } from '../../stores/sceneStore';
import { useCommandStore } from '../../stores/commandStore';
import { createEntity, EntityType } from '../../types/entity';

// Mock Three.js
vi.mock('three', () => ({
  Euler: class MockEuler {
    x = 0;
    y = 0;
    z = 0;
    setFromQuaternion() {
      return this;
    }
  },
  Quaternion: class MockQuaternion {
    x = 0;
    y = 0;
    z = 0;
    w = 1;
    setFromEuler() {
      return this;
    }
  },
}));

describe('PropertiesPanel', () => {
  beforeEach(() => {
    // Reset all stores
    useSelectionStore.getState().clearSelection();
    useSceneStore.getState().clearScene();
    useCommandStore.getState().clear();
  });

  it('should show empty state when nothing is selected', () => {
    render(<PropertiesPanel />);

    expect(screen.getByText('No selection')).toBeInTheDocument();
    expect(screen.getByText('Select an object to view properties')).toBeInTheDocument();
  });

  it('should show object info when one object is selected', () => {
    // Add an entity and select it
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    render(<PropertiesPanel />);

    // Name is now an editable input
    expect(screen.getByDisplayValue('Test Cube')).toBeInTheDocument();
    expect(screen.getByText('cubemesh')).toBeInTheDocument();
  });

  it('should show transform inputs when one object is selected', () => {
    const entity = createEntity('entity-1', 'Test Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    render(<PropertiesPanel />);

    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Rotation')).toBeInTheDocument();
    expect(screen.getByText('Scale')).toBeInTheDocument();
    expect(screen.getByTestId('position-input')).toBeInTheDocument();
    expect(screen.getByTestId('rotation-input')).toBeInTheDocument();
    expect(screen.getByTestId('scale-input')).toBeInTheDocument();
  });

  it('should show multi-select state when multiple objects are selected', () => {
    const entity1 = createEntity('entity-1', 'Cube 1', EntityType.CubeMesh);
    const entity2 = createEntity('entity-2', 'Cube 2', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity1);
    useSceneStore.getState().addEntity(entity2);
    useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);

    render(<PropertiesPanel />);

    expect(screen.getByText('2 objects selected')).toBeInTheDocument();
  });

  it('should display position values correctly', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh, {
      transform: {
        position: { x: 1.5, y: 2.5, z: 3.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    render(<PropertiesPanel />);

    expect(screen.getByTestId('position-input-x')).toHaveValue('1.50');
    expect(screen.getByTestId('position-input-y')).toHaveValue('2.50');
    expect(screen.getByTestId('position-input-z')).toHaveValue('3.50');
  });

  it('should display scale values correctly', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh, {
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 2, y: 3, z: 4 },
      },
    });
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    render(<PropertiesPanel />);

    expect(screen.getByTestId('scale-input-x')).toHaveValue('2.00');
    expect(screen.getByTestId('scale-input-y')).toHaveValue('3.00');
    expect(screen.getByTestId('scale-input-z')).toHaveValue('4.00');
  });

  it('should update store when position input changes', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    render(<PropertiesPanel />);

    const xInput = screen.getByTestId('position-input-x');
    fireEvent.change(xInput, { target: { value: '5' } });

    // Check store was updated
    const updatedEntity = useSceneStore.getState().entities['entity-1'];
    expect(updatedEntity.transform.position.x).toBe(5);
  });

  it('should create command when position input is committed', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    render(<PropertiesPanel />);

    const xInput = screen.getByTestId('position-input-x');
    fireEvent.change(xInput, { target: { value: '10' } });
    fireEvent.blur(xInput);

    // Check command was added to undo stack
    const undoStack = useCommandStore.getState().undoStack;
    expect(undoStack.length).toBe(1);
    expect(undoStack[0].description).toBe('Move entity');
  });

  it('should create command when scale input is committed', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    render(<PropertiesPanel />);

    const xInput = screen.getByTestId('scale-input-x');
    fireEvent.change(xInput, { target: { value: '2' } });
    fireEvent.blur(xInput);

    // Check command was added to undo stack
    const undoStack = useCommandStore.getState().undoStack;
    expect(undoStack.length).toBe(1);
    expect(undoStack[0].description).toBe('Scale entity');
  });

  it('should not create command if value did not change', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    render(<PropertiesPanel />);

    const xInput = screen.getByTestId('position-input-x');
    xInput.focus();
    fireEvent.blur(xInput);

    // No command should be created
    const undoStack = useCommandStore.getState().undoStack;
    expect(undoStack.length).toBe(0);
  });

  it('should switch to empty state when selection is cleared', () => {
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);
    useSelectionStore.getState().setSelected(['entity-1']);

    const { rerender } = render(<PropertiesPanel />);

    // Name is now an editable input
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();

    // Clear selection
    useSelectionStore.getState().clearSelection();
    rerender(<PropertiesPanel />);

    expect(screen.getByText('No selection')).toBeInTheDocument();
  });
});
