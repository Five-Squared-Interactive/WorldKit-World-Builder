// Copyright (c) 2019-2026 Five Squared Interactive. All rights reserved.

/**
 * useTransformControls Hook Tests
 *
 * Tests for the TransformControls integration hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoist mock functions for TransformControls
const transformControlsMocks = vi.hoisted(() => ({
  attach: vi.fn(),
  detach: vi.fn(),
  dispose: vi.fn(),
  setMode: vi.fn(),
  setSize: vi.fn(),
  getHelper: vi.fn().mockReturnValue({ type: 'Object3D' }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  visible: false,
  enabled: false,
  object: null as unknown,
  _mode: 'translate' as string,
  getMode: vi.fn().mockImplementation(() => transformControlsMocks._mode),
}));

// Mock TransformControls
vi.mock('three/addons/controls/TransformControls.js', () => {
  return {
    TransformControls: class MockTransformControls {
      visible = transformControlsMocks.visible;
      enabled = transformControlsMocks.enabled;
      object = transformControlsMocks.object;

      attach = transformControlsMocks.attach;
      detach = transformControlsMocks.detach;
      dispose = transformControlsMocks.dispose;
      setMode = transformControlsMocks.setMode;
      setSize = transformControlsMocks.setSize;
      getHelper = transformControlsMocks.getHelper;
      addEventListener = transformControlsMocks.addEventListener;
      removeEventListener = transformControlsMocks.removeEventListener;
    },
  };
});

// Import after mocks
import { useTransformControls } from './useTransformControls';
import { useSelectionStore } from '../../../stores/selectionStore';
import { useUIStore, ToolMode } from '../../../stores/uiStore';
import { useSceneStore } from '../../../stores/sceneStore';
import { useCommandStore } from '../../../stores/commandStore';
import { createEntity, EntityType } from '../../../types/entity';

// Mock Three.js objects
const mockScene = {
  add: vi.fn(),
  remove: vi.fn(),
};

const mockCamera = {};
const mockRenderer = {
  domElement: document.createElement('canvas'),
};

const mockOrbitControls = {
  enabled: true,
};

describe('useTransformControls', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    transformControlsMocks.visible = false;
    transformControlsMocks.enabled = false;
    transformControlsMocks.object = null;

    // Reset stores
    useSelectionStore.getState().clearSelection();
    useUIStore.getState().setToolMode(ToolMode.Select);
    useSceneStore.getState().clearScene();
    useCommandStore.getState().clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize TransformControls with translate mode', () => {
    const meshMapRef = { current: new Map() };

    renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    expect(transformControlsMocks.setMode).toHaveBeenCalledWith('translate');
    expect(transformControlsMocks.setSize).toHaveBeenCalledWith(0.75);
  });

  it('should add TransformControls helper to scene', () => {
    const meshMapRef = { current: new Map() };

    renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    expect(transformControlsMocks.getHelper).toHaveBeenCalled();
    expect(mockScene.add).toHaveBeenCalled();
  });

  it('should not attach gizmo when in Select mode', () => {
    const meshMapRef = { current: new Map() };

    // Add entity and mesh
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const mockMesh = { userData: { entityId: 'entity-1' } };
    meshMapRef.current.set('entity-1', mockMesh as never);

    // Select the entity but stay in Select mode
    useSelectionStore.getState().setSelected(['entity-1']);
    useUIStore.getState().setToolMode(ToolMode.Select);

    renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    expect(transformControlsMocks.attach).not.toHaveBeenCalled();
    expect(transformControlsMocks.detach).toHaveBeenCalled();
  });

  it('should attach gizmo when in Move mode with selection', () => {
    const meshMapRef = { current: new Map() };

    // Add entity and mesh
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const mockMesh = { userData: { entityId: 'entity-1' } };
    meshMapRef.current.set('entity-1', mockMesh as never);

    // Select the entity and switch to Move mode
    useSelectionStore.getState().setSelected(['entity-1']);
    useUIStore.getState().setToolMode(ToolMode.Move);

    renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    expect(transformControlsMocks.attach).toHaveBeenCalledWith(mockMesh);
  });

  it('should detach gizmo when selection is cleared', () => {
    const meshMapRef = { current: new Map() };

    // Set up initial state with selection in Move mode
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const mockMesh = { userData: { entityId: 'entity-1' } };
    meshMapRef.current.set('entity-1', mockMesh as never);

    useSelectionStore.getState().setSelected(['entity-1']);
    useUIStore.getState().setToolMode(ToolMode.Move);

    const { rerender } = renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    // Clear selection
    act(() => {
      useSelectionStore.getState().clearSelection();
    });

    rerender();

    expect(transformControlsMocks.detach).toHaveBeenCalled();
  });

  it('should switch gizmo mode when tool mode changes from Move to Rotate', () => {
    const meshMapRef = { current: new Map() };

    // Set up initial state with selection in Move mode
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const mockMesh = { userData: { entityId: 'entity-1' } };
    meshMapRef.current.set('entity-1', mockMesh as never);

    useSelectionStore.getState().setSelected(['entity-1']);
    useUIStore.getState().setToolMode(ToolMode.Move);

    const { rerender } = renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    // Verify translate mode was set initially
    expect(transformControlsMocks.setMode).toHaveBeenCalledWith('translate');

    // Change to Rotate mode
    vi.clearAllMocks();
    act(() => {
      useUIStore.getState().setToolMode(ToolMode.Rotate);
    });

    rerender();

    // Should switch to rotate mode, not detach
    expect(transformControlsMocks.setMode).toHaveBeenCalledWith('rotate');
  });

  it('should detach gizmo when tool mode changes from Move to Select', () => {
    const meshMapRef = { current: new Map() };

    // Set up initial state with selection in Move mode
    const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity);

    const mockMesh = { userData: { entityId: 'entity-1' } };
    meshMapRef.current.set('entity-1', mockMesh as never);

    useSelectionStore.getState().setSelected(['entity-1']);
    useUIStore.getState().setToolMode(ToolMode.Move);

    const { rerender } = renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    // Change to Select mode (should detach)
    act(() => {
      useUIStore.getState().setToolMode(ToolMode.Select);
    });

    rerender();

    expect(transformControlsMocks.detach).toHaveBeenCalled();
  });

  it('should register event listeners for dragging-changed and objectChange', () => {
    const meshMapRef = { current: new Map() };

    renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    expect(transformControlsMocks.addEventListener).toHaveBeenCalledWith(
      'dragging-changed',
      expect.any(Function)
    );
    expect(transformControlsMocks.addEventListener).toHaveBeenCalledWith(
      'objectChange',
      expect.any(Function)
    );
  });

  it('should cleanup on unmount', () => {
    const meshMapRef = { current: new Map() };

    const { unmount } = renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    unmount();

    expect(mockScene.remove).toHaveBeenCalled();
    expect(transformControlsMocks.dispose).toHaveBeenCalled();
  });

  it('should handle multi-selection by attaching to first selected', () => {
    const meshMapRef = { current: new Map() };

    // Add two entities
    const entity1 = createEntity('entity-1', 'Test 1', EntityType.CubeMesh);
    const entity2 = createEntity('entity-2', 'Test 2', EntityType.CubeMesh);
    useSceneStore.getState().addEntity(entity1);
    useSceneStore.getState().addEntity(entity2);

    const mockMesh1 = { userData: { entityId: 'entity-1' } };
    const mockMesh2 = { userData: { entityId: 'entity-2' } };
    meshMapRef.current.set('entity-1', mockMesh1 as never);
    meshMapRef.current.set('entity-2', mockMesh2 as never);

    // Multi-select both entities
    useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);
    useUIStore.getState().setToolMode(ToolMode.Move);

    renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    // Should attach to first selected entity
    expect(transformControlsMocks.attach).toHaveBeenCalledWith(mockMesh1);
  });

  it('should not initialize when camera is null', () => {
    const meshMapRef = { current: new Map() };

    renderHook(() =>
      useTransformControls({
        camera: null,
        renderer: mockRenderer as never,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    expect(transformControlsMocks.setMode).not.toHaveBeenCalled();
  });

  it('should not initialize when renderer is null', () => {
    const meshMapRef = { current: new Map() };

    renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: null,
        scene: mockScene as never,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    expect(transformControlsMocks.setMode).not.toHaveBeenCalled();
  });

  it('should not initialize when scene is null', () => {
    const meshMapRef = { current: new Map() };

    renderHook(() =>
      useTransformControls({
        camera: mockCamera as never,
        renderer: mockRenderer as never,
        scene: null,
        meshMapRef: meshMapRef as never,
        orbitControls: mockOrbitControls as never,
      })
    );

    expect(transformControlsMocks.setMode).not.toHaveBeenCalled();
  });

  // Rotate mode tests
  describe('Rotate mode', () => {
    it('should attach gizmo when in Rotate mode with selection', () => {
      const meshMapRef = { current: new Map() };

      // Add entity and mesh
      const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      const mockMesh = { userData: { entityId: 'entity-1' } };
      meshMapRef.current.set('entity-1', mockMesh as never);

      // Select the entity and switch to Rotate mode
      useSelectionStore.getState().setSelected(['entity-1']);
      useUIStore.getState().setToolMode(ToolMode.Rotate);

      renderHook(() =>
        useTransformControls({
          camera: mockCamera as never,
          renderer: mockRenderer as never,
          scene: mockScene as never,
          meshMapRef: meshMapRef as never,
          orbitControls: mockOrbitControls as never,
        })
      );

      expect(transformControlsMocks.attach).toHaveBeenCalledWith(mockMesh);
    });

    it('should set mode to rotate when in Rotate mode', () => {
      const meshMapRef = { current: new Map() };

      // Add entity and mesh
      const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      const mockMesh = { userData: { entityId: 'entity-1' } };
      meshMapRef.current.set('entity-1', mockMesh as never);

      // Select the entity and switch to Rotate mode
      useSelectionStore.getState().setSelected(['entity-1']);
      useUIStore.getState().setToolMode(ToolMode.Rotate);

      renderHook(() =>
        useTransformControls({
          camera: mockCamera as never,
          renderer: mockRenderer as never,
          scene: mockScene as never,
          meshMapRef: meshMapRef as never,
          orbitControls: mockOrbitControls as never,
        })
      );

      // Should call setMode with 'rotate'
      expect(transformControlsMocks.setMode).toHaveBeenCalledWith('rotate');
    });

    it('should switch from translate to rotate when mode changes', () => {
      const meshMapRef = { current: new Map() };

      // Add entity and mesh
      const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      const mockMesh = { userData: { entityId: 'entity-1' } };
      meshMapRef.current.set('entity-1', mockMesh as never);

      // Start in Move mode
      useSelectionStore.getState().setSelected(['entity-1']);
      useUIStore.getState().setToolMode(ToolMode.Move);

      const { rerender } = renderHook(() =>
        useTransformControls({
          camera: mockCamera as never,
          renderer: mockRenderer as never,
          scene: mockScene as never,
          meshMapRef: meshMapRef as never,
          orbitControls: mockOrbitControls as never,
        })
      );

      // Verify translate mode was set
      expect(transformControlsMocks.setMode).toHaveBeenCalledWith('translate');

      // Clear mocks and switch to Rotate mode
      vi.clearAllMocks();
      act(() => {
        useUIStore.getState().setToolMode(ToolMode.Rotate);
      });

      rerender();

      // Verify rotate mode was set
      expect(transformControlsMocks.setMode).toHaveBeenCalledWith('rotate');
    });

    it('should detach gizmo when switching from Rotate to Select mode', () => {
      const meshMapRef = { current: new Map() };

      // Add entity and mesh
      const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      const mockMesh = { userData: { entityId: 'entity-1' } };
      meshMapRef.current.set('entity-1', mockMesh as never);

      // Start in Rotate mode
      useSelectionStore.getState().setSelected(['entity-1']);
      useUIStore.getState().setToolMode(ToolMode.Rotate);

      const { rerender } = renderHook(() =>
        useTransformControls({
          camera: mockCamera as never,
          renderer: mockRenderer as never,
          scene: mockScene as never,
          meshMapRef: meshMapRef as never,
          orbitControls: mockOrbitControls as never,
        })
      );

      // Switch to Select mode
      act(() => {
        useUIStore.getState().setToolMode(ToolMode.Select);
      });

      rerender();

      expect(transformControlsMocks.detach).toHaveBeenCalled();
    });

    it('should attach gizmo in Scale mode with selection', () => {
      const meshMapRef = { current: new Map() };

      // Add entity and mesh
      const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      const mockMesh = { userData: { entityId: 'entity-1' } };
      meshMapRef.current.set('entity-1', mockMesh as never);

      // Select the entity and switch to Scale mode
      useSelectionStore.getState().setSelected(['entity-1']);
      useUIStore.getState().setToolMode(ToolMode.Scale);

      renderHook(() =>
        useTransformControls({
          camera: mockCamera as never,
          renderer: mockRenderer as never,
          scene: mockScene as never,
          meshMapRef: meshMapRef as never,
          orbitControls: mockOrbitControls as never,
        })
      );

      expect(transformControlsMocks.attach).toHaveBeenCalledWith(mockMesh);
    });

    it('should set mode to scale when in Scale mode', () => {
      const meshMapRef = { current: new Map() };

      // Add entity and mesh
      const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      const mockMesh = { userData: { entityId: 'entity-1' } };
      meshMapRef.current.set('entity-1', mockMesh as never);

      // Select the entity and switch to Scale mode
      useSelectionStore.getState().setSelected(['entity-1']);
      useUIStore.getState().setToolMode(ToolMode.Scale);

      renderHook(() =>
        useTransformControls({
          camera: mockCamera as never,
          renderer: mockRenderer as never,
          scene: mockScene as never,
          meshMapRef: meshMapRef as never,
          orbitControls: mockOrbitControls as never,
        })
      );

      // Should call setMode with 'scale'
      expect(transformControlsMocks.setMode).toHaveBeenCalledWith('scale');
    });

    it('should switch from rotate to scale when mode changes', () => {
      const meshMapRef = { current: new Map() };

      // Add entity and mesh
      const entity = createEntity('entity-1', 'Test', EntityType.CubeMesh);
      useSceneStore.getState().addEntity(entity);

      const mockMesh = { userData: { entityId: 'entity-1' } };
      meshMapRef.current.set('entity-1', mockMesh as never);

      // Start in Rotate mode
      useSelectionStore.getState().setSelected(['entity-1']);
      useUIStore.getState().setToolMode(ToolMode.Rotate);

      const { rerender } = renderHook(() =>
        useTransformControls({
          camera: mockCamera as never,
          renderer: mockRenderer as never,
          scene: mockScene as never,
          meshMapRef: meshMapRef as never,
          orbitControls: mockOrbitControls as never,
        })
      );

      // Verify rotate mode was set initially
      expect(transformControlsMocks.setMode).toHaveBeenCalledWith('rotate');

      // Clear mocks and switch to Scale mode
      vi.clearAllMocks();
      act(() => {
        useUIStore.getState().setToolMode(ToolMode.Scale);
      });

      rerender();

      // Verify scale mode was set
      expect(transformControlsMocks.setMode).toHaveBeenCalledWith('scale');
    });
  });
});
