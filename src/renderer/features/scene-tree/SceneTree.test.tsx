/**
 * SceneTree Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneTree } from './SceneTree';
import { useSceneStore, useSelectionStore, useCommandStore } from '../../stores';
import { createEntity, EntityType } from '../../types/entity';

describe('SceneTree', () => {
  beforeEach(() => {
    // Reset stores before each test
    useSceneStore.getState().clearScene();
    useSelectionStore.getState().clearSelection();
    useCommandStore.getState().clear();
  });

  it('renders empty state when no entities exist', () => {
    render(<SceneTree />);

    expect(screen.getByText('No objects in scene')).toBeInTheDocument();
    expect(screen.getByText('Drag assets from the library below')).toBeInTheDocument();
  });

  it('renders root entities in tree view', () => {
    const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
    const sphere = createEntity('sphere-1', 'My Sphere', EntityType.SphereMesh);

    useSceneStore.getState().addEntity(cube);
    useSceneStore.getState().addEntity(sphere);

    render(<SceneTree />);

    expect(screen.getByText('My Cube')).toBeInTheDocument();
    expect(screen.getByText('My Sphere')).toBeInTheDocument();
    expect(screen.queryByText('No objects in scene')).not.toBeInTheDocument();
  });

  it('displays parent-child relationships', () => {
    const group = createEntity('group-1', 'My Group', EntityType.Group);
    const child = createEntity('child-1', 'Child Cube', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(child, 'group-1');

    render(<SceneTree />);

    expect(screen.getByText('My Group')).toBeInTheDocument();
    expect(screen.getByText('Child Cube')).toBeInTheDocument();

    // Child should be nested under parent
    const groupNode = screen.getByTestId('tree-node-group-1');
    const childNode = screen.getByTestId('tree-node-child-1');
    expect(groupNode).toContainElement(childNode);
  });

  it('selects entity on click', () => {
    const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube);

    render(<SceneTree />);

    const cubeRow = screen.getByTestId('tree-node-row-cube-1');
    fireEvent.click(cubeRow);

    expect(useSelectionStore.getState().selectedIds).toEqual(['cube-1']);
  });

  it('highlights selected entities', () => {
    const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube);
    useSelectionStore.getState().setSelected(['cube-1']);

    render(<SceneTree />);

    const cubeRow = screen.getByTestId('tree-node-row-cube-1');
    expect(cubeRow).toHaveAttribute('aria-selected', 'true');
  });

  it('supports multi-select with Ctrl+click', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    const sphere = createEntity('sphere-1', 'Sphere', EntityType.SphereMesh);

    useSceneStore.getState().addEntity(cube);
    useSceneStore.getState().addEntity(sphere);

    render(<SceneTree />);

    // Select first entity
    fireEvent.click(screen.getByTestId('tree-node-row-cube-1'));
    expect(useSelectionStore.getState().selectedIds).toEqual(['cube-1']);

    // Ctrl+click to add second entity
    fireEvent.click(screen.getByTestId('tree-node-row-sphere-1'), { ctrlKey: true });
    expect(useSelectionStore.getState().selectedIds).toContain('cube-1');
    expect(useSelectionStore.getState().selectedIds).toContain('sphere-1');
  });

  it('toggles selection with Ctrl+click on selected item', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    const sphere = createEntity('sphere-1', 'Sphere', EntityType.SphereMesh);

    useSceneStore.getState().addEntity(cube);
    useSceneStore.getState().addEntity(sphere);
    useSelectionStore.getState().setSelected(['cube-1', 'sphere-1']);

    render(<SceneTree />);

    // Ctrl+click to deselect cube
    fireEvent.click(screen.getByTestId('tree-node-row-cube-1'), { ctrlKey: true });
    expect(useSelectionStore.getState().selectedIds).toEqual(['sphere-1']);
  });

  it('adds to selection with Shift+click', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    const sphere = createEntity('sphere-1', 'Sphere', EntityType.SphereMesh);

    useSceneStore.getState().addEntity(cube);
    useSceneStore.getState().addEntity(sphere);

    render(<SceneTree />);

    fireEvent.click(screen.getByTestId('tree-node-row-cube-1'));
    fireEvent.click(screen.getByTestId('tree-node-row-sphere-1'), { shiftKey: true });

    expect(useSelectionStore.getState().selectedIds).toContain('cube-1');
    expect(useSelectionStore.getState().selectedIds).toContain('sphere-1');
  });

  it('clears selection when clicking tree background', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube);
    useSelectionStore.getState().setSelected(['cube-1']);

    render(<SceneTree />);

    expect(useSelectionStore.getState().selectedIds).toEqual(['cube-1']);

    // Click on the tree container (not a node)
    const treeContent = screen.getByTestId('scene-tree-content');
    fireEvent.click(treeContent);

    expect(useSelectionStore.getState().selectedIds).toEqual([]);
  });

  it('displays correct icons for different entity types', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    const sphere = createEntity('sphere-1', 'Sphere', EntityType.SphereMesh);
    const group = createEntity('group-1', 'Group', EntityType.Group);
    const light = createEntity('light-1', 'Light', EntityType.Light);

    useSceneStore.getState().addEntity(cube);
    useSceneStore.getState().addEntity(sphere);
    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(light);

    render(<SceneTree />);

    // All entities should be rendered
    expect(screen.getByText('Cube')).toBeInTheDocument();
    expect(screen.getByText('Sphere')).toBeInTheDocument();
    expect(screen.getByText('Group')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  describe('entity type icons', () => {
    it('displays correct icon for Group', () => {
      const entity = createEntity('group-1', 'Group', EntityType.Group);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('📁')).toBeInTheDocument();
    });

    it('displays correct icon for Light', () => {
      const entity = createEntity('light-1', 'Light', EntityType.Light);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('💡')).toBeInTheDocument();
    });

    it('displays correct icon for CubeMesh', () => {
      const entity = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('▣')).toBeInTheDocument();
    });

    it('displays correct icon for SphereMesh', () => {
      const entity = createEntity('sphere-1', 'Sphere', EntityType.SphereMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('●')).toBeInTheDocument();
    });

    it('displays correct icon for PlaneMesh', () => {
      const entity = createEntity('plane-1', 'Plane', EntityType.PlaneMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('▭')).toBeInTheDocument();
    });

    it('displays correct icon for CylinderMesh', () => {
      const entity = createEntity('cylinder-1', 'Cylinder', EntityType.CylinderMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('⬡')).toBeInTheDocument();
    });

    it('displays correct icon for CapsuleMesh', () => {
      const entity = createEntity('capsule-1', 'Capsule', EntityType.CapsuleMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('💊')).toBeInTheDocument();
    });

    it('displays correct icon for TorusMesh', () => {
      const entity = createEntity('torus-1', 'Torus', EntityType.TorusMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('◎')).toBeInTheDocument();
    });

    it('displays correct icon for ConeMesh', () => {
      const entity = createEntity('cone-1', 'Cone', EntityType.ConeMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    it('displays correct icon for PyramidMesh', () => {
      const entity = createEntity('pyramid-1', 'Pyramid', EntityType.PyramidMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('△')).toBeInTheDocument();
    });

    it('displays correct icon for TetrahedronMesh', () => {
      const entity = createEntity('tetra-1', 'Tetrahedron', EntityType.TetrahedronMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('◬')).toBeInTheDocument();
    });

    it('displays correct icon for PrismMesh', () => {
      const entity = createEntity('prism-1', 'Prism', EntityType.PrismMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('⬢')).toBeInTheDocument();
    });

    it('displays correct icon for ArchMesh', () => {
      const entity = createEntity('arch-1', 'Arch', EntityType.ArchMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('⌓')).toBeInTheDocument();
    });

    it('displays correct icon for GltfMesh', () => {
      const entity = createEntity('gltf-1', 'Model', EntityType.GltfMesh);
      useSceneStore.getState().addEntity(entity);
      render(<SceneTree />);
      expect(screen.getByText('🎨')).toBeInTheDocument();
    });
  });

  it('shows expand button for entities with children', () => {
    const group = createEntity('group-1', 'My Group', EntityType.Group);
    const child = createEntity('child-1', 'Child', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(child, 'group-1');

    render(<SceneTree />);

    const expandButton = screen.getByTestId('tree-node-expand-group-1');
    expect(expandButton).toBeInTheDocument();
  });

  it('hides expand button for entities without children', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube);

    render(<SceneTree />);

    expect(screen.queryByTestId('tree-node-expand-cube-1')).not.toBeInTheDocument();
  });

  it('collapses and expands children on expand button click', () => {
    const group = createEntity('group-1', 'My Group', EntityType.Group);
    const child = createEntity('child-1', 'Child', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(child, 'group-1');

    render(<SceneTree />);

    // Child should be visible by default (expanded)
    expect(screen.getByText('Child')).toBeInTheDocument();

    // Collapse
    const expandButton = screen.getByTestId('tree-node-expand-group-1');
    fireEvent.click(expandButton);

    // Child should be hidden
    expect(screen.queryByText('Child')).not.toBeInTheDocument();

    // Expand again
    fireEvent.click(expandButton);

    // Child should be visible again
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('does not select when clicking expand button', () => {
    const group = createEntity('group-1', 'My Group', EntityType.Group);
    const child = createEntity('child-1', 'Child', EntityType.CubeMesh);

    useSceneStore.getState().addEntity(group);
    useSceneStore.getState().addEntity(child, 'group-1');

    render(<SceneTree />);

    const expandButton = screen.getByTestId('tree-node-expand-group-1');
    fireEvent.click(expandButton);

    // Should not have selected the group
    expect(useSelectionStore.getState().selectedIds).toEqual([]);
  });

  it('has correct accessibility attributes', () => {
    const cube = createEntity('cube-1', 'Cube', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(cube);

    render(<SceneTree />);

    const tree = screen.getByRole('tree');
    expect(tree).toHaveAttribute('aria-label', 'Scene hierarchy');

    const treeItem = screen.getByRole('treeitem');
    expect(treeItem).toBeInTheDocument();
  });

  // Rename functionality tests
  describe('rename functionality', () => {
    it('shows input on double-click', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      const input = screen.getByTestId('tree-node-input-cube-1');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('My Cube');
    });

    it('shows input on F2 when selected', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);
      useSelectionStore.getState().setSelected(['cube-1']);

      render(<SceneTree />);

      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.keyDown(row, { key: 'F2' });

      const input = screen.getByTestId('tree-node-input-cube-1');
      expect(input).toBeInTheDocument();
    });

    it('does not show input on F2 when not selected', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.keyDown(row, { key: 'F2' });

      expect(screen.queryByTestId('tree-node-input-cube-1')).not.toBeInTheDocument();
    });

    it('confirms rename on Enter', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      // Start editing
      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      // Change value
      const input = screen.getByTestId('tree-node-input-cube-1');
      fireEvent.change(input, { target: { value: 'New Name' } });

      // Confirm with Enter
      fireEvent.keyDown(input, { key: 'Enter' });

      // Input should be gone
      expect(screen.queryByTestId('tree-node-input-cube-1')).not.toBeInTheDocument();

      // Entity should be renamed
      expect(useSceneStore.getState().getEntity('cube-1')?.name).toBe('New Name');
    });

    it('cancels rename on Escape', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      // Start editing
      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      // Change value
      const input = screen.getByTestId('tree-node-input-cube-1');
      fireEvent.change(input, { target: { value: 'New Name' } });

      // Cancel with Escape
      fireEvent.keyDown(input, { key: 'Escape' });

      // Input should be gone
      expect(screen.queryByTestId('tree-node-input-cube-1')).not.toBeInTheDocument();

      // Entity should NOT be renamed
      expect(useSceneStore.getState().getEntity('cube-1')?.name).toBe('My Cube');
    });

    it('shows error for empty name', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      // Start editing
      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      // Clear value
      const input = screen.getByTestId('tree-node-input-cube-1');
      fireEvent.change(input, { target: { value: '' } });

      // Try to confirm
      fireEvent.keyDown(input, { key: 'Enter' });

      // Input should still be visible with error
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('trims whitespace from name', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      // Start editing
      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      // Add whitespace
      const input = screen.getByTestId('tree-node-input-cube-1');
      fireEvent.change(input, { target: { value: '  Trimmed Name  ' } });

      // Confirm
      fireEvent.keyDown(input, { key: 'Enter' });

      // Entity should have trimmed name
      expect(useSceneStore.getState().getEntity('cube-1')?.name).toBe('Trimmed Name');
    });

    it('does not create command when name is unchanged', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      // Start editing
      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      // Don't change value
      const input = screen.getByTestId('tree-node-input-cube-1');
      fireEvent.keyDown(input, { key: 'Enter' });

      // No command should be in history
      expect(useCommandStore.getState().undoStack.length).toBe(0);
    });

    it('rename is undoable', () => {
      const cube = createEntity('cube-1', 'Original', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      // Start editing
      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      // Change value
      const input = screen.getByTestId('tree-node-input-cube-1');
      fireEvent.change(input, { target: { value: 'Changed' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(useSceneStore.getState().getEntity('cube-1')?.name).toBe('Changed');

      // Undo
      useCommandStore.getState().undo();

      expect(useSceneStore.getState().getEntity('cube-1')?.name).toBe('Original');
    });

    it('confirms on blur with valid name', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      // Start editing
      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      // Change value
      const input = screen.getByTestId('tree-node-input-cube-1');
      fireEvent.change(input, { target: { value: 'Blur Name' } });

      // Blur
      fireEvent.blur(input);

      // Input should be gone
      expect(screen.queryByTestId('tree-node-input-cube-1')).not.toBeInTheDocument();

      // Entity should be renamed
      expect(useSceneStore.getState().getEntity('cube-1')?.name).toBe('Blur Name');
    });

    it('cancels on blur with empty name', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      // Start editing
      const row = screen.getByTestId('tree-node-row-cube-1');
      fireEvent.doubleClick(row);

      // Clear value
      const input = screen.getByTestId('tree-node-input-cube-1');
      fireEvent.change(input, { target: { value: '' } });

      // Blur
      fireEvent.blur(input);

      // Input should be gone
      expect(screen.queryByTestId('tree-node-input-cube-1')).not.toBeInTheDocument();

      // Entity should NOT be renamed
      expect(useSceneStore.getState().getEntity('cube-1')?.name).toBe('My Cube');
    });
  });

  // Drag and drop reparenting tests
  describe('drag and drop reparenting', () => {
    /**
     * Mock DataTransfer for JSDOM environment
     */
    class MockDataTransfer {
      private data: Map<string, string> = new Map();
      types: string[] = [];

      setData(format: string, data: string): void {
        this.data.set(format, data);
        if (!this.types.includes(format)) {
          this.types.push(format);
        }
      }

      getData(format: string): string {
        return this.data.get(format) ?? '';
      }

      clearData(): void {
        this.data.clear();
        this.types = [];
      }
    }

    /**
     * Helper to create a drag event with proper dataTransfer
     */
    function createDragEvent(
      _type: string,
      data: { id: string; index: number; parentId: string | null },
      clientY: number = 0
    ): Partial<React.DragEvent> {
      const dataTransfer = new MockDataTransfer();
      dataTransfer.setData('text/plain', data.id);
      dataTransfer.setData('application/x-tree-node', JSON.stringify(data));

      return {
        dataTransfer: dataTransfer as unknown as DataTransfer,
        preventDefault: () => {},
        stopPropagation: () => {},
        clientY,
      };
    }

    it('should reparent entity when dropped on a group (inside zone)', () => {
      const group = createEntity('group-1', 'My Group', EntityType.Group);
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);

      useSceneStore.getState().addEntity(group);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      const cubeRow = screen.getByTestId('tree-node-row-cube-1');
      const groupRow = screen.getByTestId('tree-node-row-group-1');

      // Get group row bounding rect for drop position calculation
      const groupRect = groupRow.getBoundingClientRect();
      const middleY = groupRect.top + groupRect.height / 2; // Middle of row = "inside" zone

      // Simulate drag start on cube
      const dragStartEvent = createDragEvent('dragstart', {
        id: 'cube-1',
        index: 1,
        parentId: null,
      });
      fireEvent.dragStart(cubeRow, dragStartEvent);

      // Simulate drag over group (middle zone)
      const dragOverEvent = createDragEvent(
        'dragover',
        { id: 'cube-1', index: 1, parentId: null },
        middleY
      );
      fireEvent.dragOver(groupRow, dragOverEvent);

      // Simulate drop on group
      const dropEvent = createDragEvent(
        'drop',
        { id: 'cube-1', index: 1, parentId: null },
        middleY
      );
      fireEvent.drop(groupRow, dropEvent);

      // Cube should now be a child of group
      const updatedCube = useSceneStore.getState().getEntity('cube-1');
      const updatedGroup = useSceneStore.getState().getEntity('group-1');

      expect(updatedCube?.parentId).toBe('group-1');
      expect(updatedGroup?.childIds).toContain('cube-1');
    });

    it('should undo reparent operation', () => {
      const group = createEntity('group-1', 'My Group', EntityType.Group);
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);

      useSceneStore.getState().addEntity(group);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      const cubeRow = screen.getByTestId('tree-node-row-cube-1');
      const groupRow = screen.getByTestId('tree-node-row-group-1');

      const groupRect = groupRow.getBoundingClientRect();
      const middleY = groupRect.top + groupRect.height / 2;

      // Drag cube into group
      fireEvent.dragStart(
        cubeRow,
        createDragEvent('dragstart', { id: 'cube-1', index: 1, parentId: null })
      );
      fireEvent.dragOver(
        groupRow,
        createDragEvent('dragover', { id: 'cube-1', index: 1, parentId: null }, middleY)
      );
      fireEvent.drop(
        groupRow,
        createDragEvent('drop', { id: 'cube-1', index: 1, parentId: null }, middleY)
      );

      // Verify reparent happened
      expect(useSceneStore.getState().getEntity('cube-1')?.parentId).toBe('group-1');

      // Undo
      useCommandStore.getState().undo();

      // Cube should be back at root
      expect(useSceneStore.getState().getEntity('cube-1')?.parentId).toBeNull();
      expect(useSceneStore.getState().rootIds).toContain('cube-1');
    });

    it('should not allow dropping entity onto itself', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);

      render(<SceneTree />);

      const cubeRow = screen.getByTestId('tree-node-row-cube-1');
      const cubeRect = cubeRow.getBoundingClientRect();
      const middleY = cubeRect.top + cubeRect.height / 2;

      // Try to drop cube on itself
      fireEvent.dragStart(
        cubeRow,
        createDragEvent('dragstart', { id: 'cube-1', index: 0, parentId: null })
      );
      fireEvent.drop(
        cubeRow,
        createDragEvent('drop', { id: 'cube-1', index: 0, parentId: null }, middleY)
      );

      // No command should be created
      expect(useCommandStore.getState().undoStack.length).toBe(0);
    });

    it('should not allow circular reparenting (parent into child)', () => {
      const group = createEntity('group-1', 'Parent Group', EntityType.Group);
      const childGroup = createEntity('child-group-1', 'Child Group', EntityType.Group);

      useSceneStore.getState().addEntity(group);
      useSceneStore.getState().addEntity(childGroup, 'group-1');

      render(<SceneTree />);

      const parentRow = screen.getByTestId('tree-node-row-group-1');
      const childRow = screen.getByTestId('tree-node-row-child-group-1');
      const childRect = childRow.getBoundingClientRect();
      const middleY = childRect.top + childRect.height / 2;

      // Try to drop parent group into child group
      fireEvent.dragStart(
        parentRow,
        createDragEvent('dragstart', { id: 'group-1', index: 0, parentId: null })
      );
      fireEvent.drop(
        childRow,
        createDragEvent('drop', { id: 'group-1', index: 0, parentId: null }, middleY)
      );

      // Parent should NOT become a child of the child
      expect(useSceneStore.getState().getEntity('group-1')?.parentId).toBeNull();
      expect(useSceneStore.getState().getEntity('child-group-1')?.childIds).not.toContain(
        'group-1'
      );
    });

    it('should parent entity when dropped on another entity (middle zone)', () => {
      const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
      const cube2 = createEntity('cube-2', 'Cube 2', EntityType.CubeMesh);

      useSceneStore.getState().addEntity(cube1);
      useSceneStore.getState().addEntity(cube2);

      render(<SceneTree />);

      const cube2Row = screen.getByTestId('tree-node-row-cube-2');
      const cube1Row = screen.getByTestId('tree-node-row-cube-1');

      // Mock getBoundingClientRect for proper drop position calculation
      const mockRect = { top: 0, bottom: 30, left: 0, right: 100, width: 100, height: 30 };
      vi.spyOn(cube1Row, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);

      // Middle of row (y=15) should trigger "inside" zone (parenting)
      const middleY = 15;

      fireEvent.dragStart(
        cube2Row,
        createDragEvent('dragstart', { id: 'cube-2', index: 1, parentId: null })
      );
      fireEvent.drop(
        cube1Row,
        createDragEvent('drop', { id: 'cube-2', index: 1, parentId: null }, middleY)
      );

      // cube-2 should now be a child of cube-1
      const updatedCube1 = useSceneStore.getState().getEntity('cube-1');
      const updatedCube2 = useSceneStore.getState().getEntity('cube-2');

      expect(updatedCube2?.parentId).toBe('cube-1');
      expect(updatedCube1?.childIds).toContain('cube-2');
    });
  });

  describe('selection highlighting', () => {
    it('applies selected class to tree node when selected', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);
      useSelectionStore.getState().setSelected(['cube-1']);

      render(<SceneTree />);

      const treeNode = screen.getByTestId('tree-node-cube-1');
      expect(treeNode).toHaveClass('selected');
    });

    it('does not apply selected class when not selected', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);
      // Don't select anything

      render(<SceneTree />);

      const treeNode = screen.getByTestId('tree-node-cube-1');
      expect(treeNode).not.toHaveClass('selected');
    });

    it('updates highlighting when selection changes', () => {
      const cube1 = createEntity('cube-1', 'Cube 1', EntityType.CubeMesh);
      const cube2 = createEntity('cube-2', 'Cube 2', EntityType.SphereMesh);
      useSceneStore.getState().addEntity(cube1);
      useSceneStore.getState().addEntity(cube2);

      const { rerender } = render(<SceneTree />);

      // Select first cube
      useSelectionStore.getState().setSelected(['cube-1']);
      rerender(<SceneTree />);

      expect(screen.getByTestId('tree-node-cube-1')).toHaveClass('selected');
      expect(screen.getByTestId('tree-node-cube-2')).not.toHaveClass('selected');

      // Change selection to second cube
      useSelectionStore.getState().setSelected(['cube-2']);
      rerender(<SceneTree />);

      expect(screen.getByTestId('tree-node-cube-1')).not.toHaveClass('selected');
      expect(screen.getByTestId('tree-node-cube-2')).toHaveClass('selected');
    });

    it('applies aria-selected attribute when selected', () => {
      const cube = createEntity('cube-1', 'My Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(cube);
      useSelectionStore.getState().setSelected(['cube-1']);

      render(<SceneTree />);

      const row = screen.getByTestId('tree-node-row-cube-1');
      expect(row).toHaveAttribute('aria-selected', 'true');
    });
  });
});
