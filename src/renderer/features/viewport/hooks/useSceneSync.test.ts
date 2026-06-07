/**
 * useSceneSync Hook Tests
 *
 * Tests for synchronizing sceneStore with Three.js scene.
 * Includes tests for parent-child hierarchy behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Scene, Mesh, Object3D, Group } from 'three';
import { useSceneSync } from './useSceneSync';
import { useSceneStore } from '../../../stores/sceneStore';
import { EntityType, createEntity, Entity } from '../../../types/entity';

// Helper to create a mock Object3D-like object that supports hierarchy
function createMockObject3D(userData: Record<string, unknown> = {}): Object3D {
  const children: Object3D[] = [];
  const obj: Partial<Object3D> = {
    userData,
    children,
    parent: null,
    position: {
      set: vi.fn(),
      x: 0,
      y: 0,
      z: 0,
      copy: vi.fn(),
      clone: vi.fn(),
    } as unknown as Object3D['position'],
    quaternion: {
      set: vi.fn(),
      copy: vi.fn(),
      multiply: vi.fn(),
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    } as unknown as Object3D['quaternion'],
    scale: {
      set: vi.fn(),
      x: 1,
      y: 1,
      z: 1,
      copy: vi.fn(),
    } as unknown as Object3D['scale'],
    rotation: {
      x: 0,
      y: 0,
      z: 0,
      set: vi.fn(),
    } as unknown as Object3D['rotation'],
    add: vi.fn((child: Object3D) => {
      children.push(child);
      (child as { parent: Object3D | null }).parent = obj as Object3D;
      return obj as Object3D;
    }),
    remove: vi.fn((child: Object3D) => {
      const idx = children.indexOf(child);
      if (idx >= 0) {
        children.splice(idx, 1);
        (child as { parent: Object3D | null }).parent = null;
      }
      return obj as Object3D;
    }),
    traverse: vi.fn((callback: (obj: Object3D) => void) => {
      callback(obj as Object3D);
      children.forEach((child) => {
        if (child.traverse) {
          child.traverse(callback);
        } else {
          callback(child);
        }
      });
    }),
  };
  return obj as Object3D;
}

// Helper to create a mock mesh
function createMockMesh(entityId: string): Mesh {
  const base = createMockObject3D({ entityId });
  const mesh = base as unknown as Mesh;
  (mesh as unknown as { geometry: { dispose: () => void } }).geometry = { dispose: vi.fn() };
  (mesh as unknown as { material: { dispose: () => void; color: { equals: () => boolean; copy: () => void } } }).material = {
    dispose: vi.fn(),
    color: { equals: vi.fn(() => true), copy: vi.fn() },
  };
  return mesh;
}

// Mock createThreeMesh
vi.mock('../createThreeMesh', () => ({
  createThreeMesh: vi.fn((entity: Entity) => {
    if (
      entity.type === EntityType.Group ||
      entity.type === EntityType.Light ||
      entity.type === EntityType.GltfMesh
    ) {
      return null;
    }
    return createMockMesh(entity.id);
  }),
  disposeThreeMesh: vi.fn((mesh: Mesh) => {
    (mesh.geometry as { dispose: () => void })?.dispose();
    (mesh.material as { dispose: () => void })?.dispose();
  }),
}));

// Mock loadGltfModel
vi.mock('../loadGltfModel', () => ({
  loadGltfForEntity: vi.fn(() => Promise.resolve({ success: false, error: 'Mocked' })),
  applyEntityTransform: vi.fn(),
}));

// Mock Three.js Group - defined inside the factory to avoid hoisting issues
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  class MockGroup {
    userData: Record<string, unknown> = {};
    children: unknown[] = [];
    parent: unknown = null;
    position = {
      set: () => {},
      x: 0,
      y: 0,
      z: 0,
      copy: () => {},
      clone: () => {},
    };
    quaternion = {
      set: () => {},
      copy: () => {},
      multiply: () => {},
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    };
    scale = {
      set: () => {},
      x: 1,
      y: 1,
      z: 1,
      copy: () => {},
    };
    rotation = {
      x: 0,
      y: 0,
      z: 0,
      set: () => {},
    };

    add(child: unknown): this {
      this.children.push(child);
      (child as { parent: unknown }).parent = this;
      return this;
    }

    remove(child: unknown): this {
      const idx = this.children.indexOf(child);
      if (idx >= 0) {
        this.children.splice(idx, 1);
        (child as { parent: unknown }).parent = null;
      }
      return this;
    }

    traverse(callback: (obj: unknown) => void): void {
      callback(this);
      this.children.forEach((child) => {
        if ((child as { traverse?: (cb: (obj: unknown) => void) => void }).traverse) {
          (child as { traverse: (cb: (obj: unknown) => void) => void }).traverse(callback);
        } else {
          callback(child);
        }
      });
    }
  }

  return {
    ...actual,
    Group: MockGroup,
  };
});

describe('useSceneSync', () => {
  let mockScene: Object3D;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset scene store
    useSceneStore.setState({ entities: {}, rootIds: [] });
    // Create mock scene with proper hierarchy support
    mockScene = createMockObject3D();
  });

  afterEach(() => {
    useSceneStore.setState({ entities: {}, rootIds: [] });
  });

  it('should return a mesh map ref', () => {
    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    expect(result.current.current).toBeInstanceOf(Map);
  });

  it('should add mesh to scene when entity is added to store', () => {
    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    act(() => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
    });

    expect(mockScene.add).toHaveBeenCalled();
    expect(result.current.current.has('test-id')).toBe(true);
  });

  it('should remove mesh from scene when entity is removed from store', () => {
    // Add an entity first
    const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
    useSceneStore.setState({
      entities: { 'test-id': entity },
      rootIds: ['test-id'],
    });

    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    // Wait for effect to run
    expect(result.current.current.has('test-id')).toBe(true);

    act(() => {
      useSceneStore.getState().removeEntity('test-id');
    });

    expect(result.current.current.has('test-id')).toBe(false);
  });

  it('should dispose geometry when mesh is removed', () => {
    const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
    useSceneStore.setState({
      entities: { 'test-id': entity },
      rootIds: ['test-id'],
    });

    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    const container = result.current.current.get('test-id');
    expect(container).toBeDefined();

    act(() => {
      useSceneStore.getState().removeEntity('test-id');
    });

    // Container should be removed from the mesh map
    expect(result.current.current.has('test-id')).toBe(false);
    // And removed from scene
    expect(mockScene.children).not.toContain(container);
  });

  it('should not add mesh for unsupported entity types', () => {
    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    act(() => {
      const entity = createEntity('test-id', 'Test Group', EntityType.Group);
      useSceneStore.getState().addEntity(entity);
    });

    // Scene.add should not be called for Group entities
    expect(mockScene.add).not.toHaveBeenCalled();
    expect(result.current.current.has('test-id')).toBe(false);
  });

  it('should handle null scene gracefully', () => {
    const { result } = renderHook(() => useSceneSync(null));

    act(() => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
    });

    // No meshes should be created when scene is null
    expect(result.current.current.size).toBe(0);
  });

  it('should not recreate existing meshes when entities change', () => {
    const entity1 = createEntity('id-1', 'Cube 1', EntityType.CubeMesh);
    useSceneStore.setState({
      entities: { 'id-1': entity1 },
      rootIds: ['id-1'],
    });

    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    const containerBeforeAdd = result.current.current.get('id-1');

    act(() => {
      const entity2 = createEntity('id-2', 'Cube 2', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity2);
    });

    // Original container should still be the same reference
    expect(result.current.current.get('id-1')).toBe(containerBeforeAdd);
  });

  it('should handle multiple entities being added at once', () => {
    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    act(() => {
      const entity1 = createEntity('id-1', 'Cube 1', EntityType.CubeMesh);
      const entity2 = createEntity('id-2', 'Sphere 1', EntityType.SphereMesh);
      useSceneStore.setState({
        entities: { 'id-1': entity1, 'id-2': entity2 },
        rootIds: ['id-1', 'id-2'],
      });
    });

    expect(mockScene.add).toHaveBeenCalledTimes(2);
    expect(result.current.current.size).toBe(2);
  });

  it('should store entityId in container userData', () => {
    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    act(() => {
      const entity = createEntity('my-entity-id', 'Test Cube', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);
    });

    const container = result.current.current.get('my-entity-id');
    expect(container?.userData.entityId).toBe('my-entity-id');
  });

  it('should sync container transform when entity transform is updated (undo/redo support)', () => {
    // Create initial entity with position at origin
    const entity = createEntity('transform-test', 'Test Cube', EntityType.CubeMesh);
    useSceneStore.setState({
      entities: { 'transform-test': entity },
      rootIds: ['transform-test'],
    });

    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    const container = result.current.current.get('transform-test');
    expect(container).toBeDefined();

    // Simulate a transform update (like what undo/redo would do)
    act(() => {
      useSceneStore.getState().updateEntityTransform('transform-test', {
        position: { x: 5, y: 10, z: 15 },
      });
    });

    // Verify that the entity state in store was updated
    const updatedEntity = useSceneStore.getState().entities['transform-test'];
    expect(updatedEntity.transform.position).toEqual({ x: 5, y: 10, z: 15 });
    // Container should still exist and be in the map
    expect(result.current.current.has('transform-test')).toBe(true);
  });

  it('should sync container rotation when entity rotation is updated', () => {
    const entity = createEntity('rotation-test', 'Test Cube', EntityType.CubeMesh);
    useSceneStore.setState({
      entities: { 'rotation-test': entity },
      rootIds: ['rotation-test'],
    });

    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    const container = result.current.current.get('rotation-test');
    expect(container).toBeDefined();

    // Simulate a rotation update
    act(() => {
      useSceneStore.getState().updateEntityTransform('rotation-test', {
        rotation: { x: 0.1, y: 0.2, z: 0.3, w: 0.9 },
      });
    });

    // Verify that the entity state in store was updated
    const updatedEntity = useSceneStore.getState().entities['rotation-test'];
    expect(updatedEntity.transform.rotation).toEqual({ x: 0.1, y: 0.2, z: 0.3, w: 0.9 });
    // Container should still exist
    expect(result.current.current.has('rotation-test')).toBe(true);
  });

  it('should sync container scale when entity scale is updated', () => {
    const entity = createEntity('scale-test', 'Test Cube', EntityType.CubeMesh);
    useSceneStore.setState({
      entities: { 'scale-test': entity },
      rootIds: ['scale-test'],
    });

    const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

    const container = result.current.current.get('scale-test');
    expect(container).toBeDefined();

    // Simulate a scale update
    act(() => {
      useSceneStore.getState().updateEntityTransform('scale-test', {
        scale: { x: 2, y: 3, z: 4 },
      });
    });

    // Verify that the entity state in store was updated
    const updatedEntity = useSceneStore.getState().entities['scale-test'];
    expect(updatedEntity.transform.scale).toEqual({ x: 2, y: 3, z: 4 });
    // Container should still exist
    expect(result.current.current.has('scale-test')).toBe(true);
  });

  // Parent-Child Hierarchy Tests
  describe('Parent-Child Hierarchy', () => {
    it('should add child container to parent container when child has parentId', () => {
      const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

      act(() => {
        // First add parent
        const parent = createEntity('parent-id', 'Parent Cube', EntityType.CubeMesh);
        useSceneStore.getState().addEntity(parent);
      });

      const parentContainer = result.current.current.get('parent-id');
      expect(parentContainer).toBeDefined();

      act(() => {
        // Then add child with parentId
        const child = createEntity('child-id', 'Child Sphere', EntityType.SphereMesh);
        child.parentId = 'parent-id';
        useSceneStore.getState().addEntity(child, 'parent-id');
      });

      const childContainer = result.current.current.get('child-id');
      expect(childContainer).toBeDefined();

      // Child should be parented to parent's children group (not directly to scene)
      // The parent container should have a children group with the child in it
      const childrenGroup = parentContainer?.children.find(
        (c) => c.userData.isChildrenGroup
      );
      expect(childrenGroup).toBeDefined();
      expect(childrenGroup?.children).toContain(childContainer);
    });

    it('should add root entities directly to scene', () => {
      renderHook(() => useSceneSync(mockScene as unknown as Scene));

      act(() => {
        const entity = createEntity('root-entity', 'Root Cube', EntityType.CubeMesh);
        useSceneStore.getState().addEntity(entity);
      });

      // Root entity container should be added directly to scene
      expect(mockScene.add).toHaveBeenCalled();
      expect(mockScene.children.length).toBe(1);
    });

    it('should process parents before children when both added simultaneously', () => {
      const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

      act(() => {
        // Add both parent and child in one state update
        const parent = createEntity('parent-id', 'Parent', EntityType.CubeMesh);
        const child = createEntity('child-id', 'Child', EntityType.SphereMesh);
        child.parentId = 'parent-id';

        useSceneStore.setState({
          entities: {
            'parent-id': parent,
            'child-id': child,
          },
          rootIds: ['parent-id'],
        });
      });

      // Both should exist
      expect(result.current.current.has('parent-id')).toBe(true);
      expect(result.current.current.has('child-id')).toBe(true);

      // Child should be parented correctly
      const parentContainer = result.current.current.get('parent-id');
      const childContainer = result.current.current.get('child-id');
      const childrenGroup = parentContainer?.children.find(
        (c) => c.userData.isChildrenGroup
      );
      expect(childrenGroup?.children).toContain(childContainer);
    });

    it('should remove child from parent when child is deleted', () => {
      const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

      act(() => {
        const parent = createEntity('parent-id', 'Parent', EntityType.CubeMesh);
        const child = createEntity('child-id', 'Child', EntityType.SphereMesh);
        child.parentId = 'parent-id';

        useSceneStore.setState({
          entities: {
            'parent-id': parent,
            'child-id': child,
          },
          rootIds: ['parent-id'],
        });
      });

      const childContainer = result.current.current.get('child-id');
      expect(childContainer).toBeDefined();

      act(() => {
        useSceneStore.getState().removeEntity('child-id');
      });

      // Child should be removed from the map
      expect(result.current.current.has('child-id')).toBe(false);

      // Parent should still exist
      expect(result.current.current.has('parent-id')).toBe(true);
    });

    it('should handle deeply nested hierarchy (grandparent-parent-child)', () => {
      const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

      act(() => {
        const grandparent = createEntity('grandparent', 'Grandparent', EntityType.CubeMesh);
        const parent = createEntity('parent', 'Parent', EntityType.SphereMesh);
        parent.parentId = 'grandparent';
        const child = createEntity('child', 'Child', EntityType.CylinderMesh);
        child.parentId = 'parent';

        useSceneStore.setState({
          entities: {
            grandparent: grandparent,
            parent: parent,
            child: child,
          },
          rootIds: ['grandparent'],
        });
      });

      // All three should exist
      expect(result.current.current.has('grandparent')).toBe(true);
      expect(result.current.current.has('parent')).toBe(true);
      expect(result.current.current.has('child')).toBe(true);

      // Verify hierarchy
      const grandparentContainer = result.current.current.get('grandparent');
      const parentContainer = result.current.current.get('parent');
      const childContainer = result.current.current.get('child');

      // Parent should be in grandparent's children group
      const grandparentChildrenGroup = grandparentContainer?.children.find(
        (c) => c.userData.isChildrenGroup
      );
      expect(grandparentChildrenGroup?.children).toContain(parentContainer);

      // Child should be in parent's children group
      const parentChildrenGroup = parentContainer?.children.find(
        (c) => c.userData.isChildrenGroup
      );
      expect(parentChildrenGroup?.children).toContain(childContainer);
    });

    it('should create children group lazily only when needed', () => {
      const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

      act(() => {
        const entity = createEntity('solo-entity', 'Solo', EntityType.CubeMesh);
        useSceneStore.getState().addEntity(entity);
      });

      const container = result.current.current.get('solo-entity');

      // Entity without children should not have a children group
      const childrenGroup = container?.children.find((c) => c.userData.isChildrenGroup);
      expect(childrenGroup).toBeUndefined();
    });

    it('should handle multiple children under same parent', () => {
      const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

      act(() => {
        const parent = createEntity('parent', 'Parent', EntityType.CubeMesh);
        const child1 = createEntity('child1', 'Child 1', EntityType.SphereMesh);
        child1.parentId = 'parent';
        const child2 = createEntity('child2', 'Child 2', EntityType.CylinderMesh);
        child2.parentId = 'parent';

        useSceneStore.setState({
          entities: {
            parent: parent,
            child1: child1,
            child2: child2,
          },
          rootIds: ['parent'],
        });
      });

      const parentContainer = result.current.current.get('parent');
      const child1Container = result.current.current.get('child1');
      const child2Container = result.current.current.get('child2');

      const childrenGroup = parentContainer?.children.find(
        (c) => c.userData.isChildrenGroup
      );

      expect(childrenGroup?.children).toContain(child1Container);
      expect(childrenGroup?.children).toContain(child2Container);
      expect(childrenGroup?.children.length).toBe(2);
    });

    it('should re-parent container when entity parentId changes (grouping scenario)', () => {
      const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

      // First, create two root-level cubes
      act(() => {
        const cube1 = createEntity('cube1', 'Cube 1', EntityType.CubeMesh);
        const cube2 = createEntity('cube2', 'Cube 2', EntityType.SphereMesh);

        useSceneStore.setState({
          entities: {
            cube1: cube1,
            cube2: cube2,
          },
          rootIds: ['cube1', 'cube2'],
        });
      });

      // Both should be direct children of scene
      expect(mockScene.children).toContain(result.current.current.get('cube1'));
      expect(mockScene.children).toContain(result.current.current.get('cube2'));

      // Now create a group and move the cubes under it (simulating Ctrl+G)
      act(() => {
        const group = createEntity('group', 'Group', EntityType.CubeMesh);

        // Update entities: add group and change cube parentIds
        const cube1 = useSceneStore.getState().entities['cube1'];
        const cube2 = useSceneStore.getState().entities['cube2'];

        useSceneStore.setState({
          entities: {
            group: group,
            cube1: { ...cube1, parentId: 'group' },
            cube2: { ...cube2, parentId: 'group' },
          },
          rootIds: ['group'],
        });
      });

      // Group should exist
      const groupContainer = result.current.current.get('group');
      expect(groupContainer).toBeDefined();

      // Both cubes should now be children of the group (in its childrenGroup)
      const cube1Container = result.current.current.get('cube1');
      const cube2Container = result.current.current.get('cube2');

      const groupChildrenGroup = groupContainer?.children.find(
        (c) => c.userData.isChildrenGroup
      );

      expect(groupChildrenGroup).toBeDefined();
      expect(groupChildrenGroup?.children).toContain(cube1Container);
      expect(groupChildrenGroup?.children).toContain(cube2Container);

      // Cubes should no longer be direct children of scene
      expect(mockScene.children).not.toContain(cube1Container);
      expect(mockScene.children).not.toContain(cube2Container);
    });

    it('should move container back to scene when unparented', () => {
      const { result } = renderHook(() => useSceneSync(mockScene as unknown as Scene));

      // Create a parent with a child
      act(() => {
        const parent = createEntity('parent', 'Parent', EntityType.CubeMesh);
        const child = createEntity('child', 'Child', EntityType.SphereMesh);
        child.parentId = 'parent';

        useSceneStore.setState({
          entities: {
            parent: parent,
            child: child,
          },
          rootIds: ['parent'],
        });
      });

      // Child should be under parent
      const childContainer = result.current.current.get('child');
      const parentContainer = result.current.current.get('parent');
      const childrenGroup = parentContainer?.children.find(
        (c) => c.userData.isChildrenGroup
      );
      expect(childrenGroup?.children).toContain(childContainer);

      // Now unparent the child (move to root)
      act(() => {
        const child = useSceneStore.getState().entities['child'];

        useSceneStore.setState({
          entities: {
            ...useSceneStore.getState().entities,
            child: { ...child, parentId: null },
          },
          rootIds: ['parent', 'child'],
        });
      });

      // Child should now be a direct child of scene
      expect(mockScene.children).toContain(childContainer);
    });
  });
});
