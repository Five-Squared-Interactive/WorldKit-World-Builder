/**
 * Viewport Component Tests
 *
 * Tests for the 3D viewport component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

// Hoist mock functions for Three.js Raycaster
const raycasterMocks = vi.hoisted(() => ({
  setFromCamera: vi.fn(),
  intersectObjects: vi.fn().mockReturnValue([]),
}));

// Create mock instances that will be shared
const mockFns = {
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  sceneAdd: vi.fn(),
  sceneRemove: vi.fn(),
  cameraPositionSet: vi.fn(),
  cameraLookAt: vi.fn(),
  cameraUpdateProjectionMatrix: vi.fn(),
  controlsUpdate: vi.fn(),
  controlsDispose: vi.fn(),
  directionalLightPositionSet: vi.fn(),
};

// Track scene children for raycasting
let mockSceneChildren: unknown[] = [];

// Mock three module - use class syntax for constructors
vi.mock('three', () => {
  const mockCanvas = document.createElement('canvas');

  return {
    WebGLRenderer: class MockWebGLRenderer {
      domElement = mockCanvas;
      shadowMap = { enabled: false };
      setPixelRatio(ratio: number) {
        mockFns.setPixelRatio(ratio);
      }
      setSize(w: number, h: number) {
        mockFns.setSize(w, h);
      }
      render() {
        mockFns.render();
      }
      dispose() {
        mockFns.dispose();
      }
    },
    Scene: class MockScene {
      background: unknown = null;
      children = mockSceneChildren;
      add(obj: unknown) {
        mockFns.sceneAdd(obj);
        mockSceneChildren.push(obj);
      }
      remove(obj: unknown) {
        mockFns.sceneRemove(obj);
        const idx = mockSceneChildren.indexOf(obj);
        if (idx !== -1) mockSceneChildren.splice(idx, 1);
      }
      traverse() {}
    },
    PerspectiveCamera: class MockPerspectiveCamera {
      position = {
        set: (x: number, y: number, z: number) => {
          mockFns.cameraPositionSet(x, y, z);
        },
        x: 0,
        y: 0,
        z: 0,
      };
      aspect = 1;
      lookAt(x: number, y: number, z: number) {
        mockFns.cameraLookAt(x, y, z);
      }
      updateProjectionMatrix() {
        mockFns.cameraUpdateProjectionMatrix();
      }
    },
    GridHelper: class MockGridHelper {},
    AmbientLight: class MockAmbientLight {},
    DirectionalLight: class MockDirectionalLight {
      position = {
        set: (x: number, y: number, z: number) => {
          mockFns.directionalLightPositionSet(x, y, z);
        },
      };
      castShadow = false;
      shadow = { mapSize: { width: 0, height: 0 } };
    },
    Color: class MockColor {
      setHex() {}
      copy() {}
      getHex() {
        return 0x000000;
      }
    },
    Raycaster: class MockRaycaster {
      setFromCamera = raycasterMocks.setFromCamera;
      intersectObjects = raycasterMocks.intersectObjects;
    },
    Vector2: class MockVector2 {
      x = 0;
      y = 0;
      set(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
      }
    },
    Mesh: class MockMesh {
      userData = {};
      material = {
        emissive: {
          setHex: vi.fn(),
          copy: vi.fn(),
          getHex: () => 0x000000,
        },
        emissiveIntensity: 0,
        dispose: vi.fn(),
      };
      geometry = { dispose: vi.fn() };
    },
    BoxGeometry: class MockBoxGeometry {
      dispose() {}
    },
    SphereGeometry: class MockSphereGeometry {
      dispose() {}
    },
    CylinderGeometry: class MockCylinderGeometry {
      dispose() {}
    },
    PlaneGeometry: class MockPlaneGeometry {
      dispose() {}
    },
    MeshStandardMaterial: class MockMeshStandardMaterial {
      emissive = {
        setHex: vi.fn(),
        copy: vi.fn(),
        getHex: () => 0x000000,
      };
      emissiveIntensity = 0;
      dispose() {}
    },
    Quaternion: class MockQuaternion {
      setFromAxisAngle() {
        return this;
      }
      multiply() {
        return this;
      }
    },
    Vector3: class MockVector3 {
      x = 0;
      y = 0;
      z = 0;
    },
  };
});

// Mock OrbitControls
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => {
  return {
    OrbitControls: class MockOrbitControls {
      enableDamping = false;
      dampingFactor = 0;
      screenSpacePanning = false;
      minDistance = 0;
      maxDistance = 0;
      maxPolarAngle = 0;
      update() {
        mockFns.controlsUpdate();
      }
      dispose() {
        mockFns.controlsDispose();
      }
    },
  };
});

// Import after mocks are set up
import { Viewport } from './Viewport';
import { useSelectionStore } from '../../stores';

describe('Viewport', () => {
  beforeEach(() => {
    // Clear all mock function calls
    Object.values(mockFns).forEach((fn) => fn.mockClear());
    raycasterMocks.setFromCamera.mockClear();
    raycasterMocks.intersectObjects.mockClear().mockReturnValue([]);
    mockSceneChildren = [];

    // Reset selection store
    useSelectionStore.getState().clearSelection();

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the viewport container', () => {
      render(<Viewport />);

      expect(screen.getByTestId('viewport')).toBeInTheDocument();
    });

    it('should render the viewport canvas container', () => {
      render(<Viewport />);

      expect(screen.getByTestId('viewport-canvas')).toBeInTheDocument();
    });

    it('should have correct CSS classes', () => {
      render(<Viewport />);

      const viewport = screen.getByTestId('viewport');
      expect(viewport).toHaveClass('viewport');

      const canvas = screen.getByTestId('viewport-canvas');
      expect(canvas).toHaveClass('viewport-canvas');
    });
  });

  describe('Three.js initialization', () => {
    it('should set renderer pixel ratio', () => {
      render(<Viewport />);

      expect(mockFns.setPixelRatio).toHaveBeenCalled();
    });

    it('should set renderer size', () => {
      render(<Viewport />);

      expect(mockFns.setSize).toHaveBeenCalled();
    });

    it('should add objects to scene', () => {
      render(<Viewport />);

      // GridHelper, AmbientLight, DirectionalLight should all be added
      expect(mockFns.sceneAdd).toHaveBeenCalled();
    });

    it('should set camera position', () => {
      render(<Viewport />);

      expect(mockFns.cameraPositionSet).toHaveBeenCalledWith(5, 5, 5);
    });

    it('should set camera lookAt', () => {
      render(<Viewport />);

      expect(mockFns.cameraLookAt).toHaveBeenCalledWith(0, 0, 0);
    });
  });

  describe('cleanup', () => {
    it('should dispose renderer on unmount', () => {
      const { unmount } = render(<Viewport />);

      unmount();

      expect(mockFns.dispose).toHaveBeenCalled();
    });

    it('should dispose controls on unmount', () => {
      const { unmount } = render(<Viewport />);

      unmount();

      expect(mockFns.controlsDispose).toHaveBeenCalled();
    });

    it('should cancel animation frame on unmount', () => {
      const { unmount } = render(<Viewport />);

      unmount();

      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('animation loop', () => {
    it('should start animation loop', () => {
      render(<Viewport />);

      expect(window.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('selection integration', () => {
    it('should have mouse event handlers on viewport canvas', () => {
      render(<Viewport />);

      const canvas = screen.getByTestId('viewport-canvas');

      // Simulate mousedown and mouseup - should not throw
      expect(() => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100 });
      }).not.toThrow();
    });

    it('should clear selection when clicking on empty space', () => {
      // First set a selection
      act(() => {
        useSelectionStore.getState().setSelected(['existing-entity']);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);

      // Raycaster returns no intersections (empty scene)
      raycasterMocks.intersectObjects.mockReturnValue([]);

      render(<Viewport />);
      const canvas = screen.getByTestId('viewport-canvas');

      // Click on empty space - should clear selection
      act(() => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100 });
      });

      expect(useSelectionStore.getState().selectedIds).toEqual([]);
    });

    it('should not clear selection when dragging (camera orbit)', () => {
      // First set a selection
      act(() => {
        useSelectionStore.getState().setSelected(['existing-entity']);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);

      render(<Viewport />);
      const canvas = screen.getByTestId('viewport-canvas');

      // Simulate drag (mousedown at one position, mouseup far away)
      act(() => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(canvas, { clientX: 200, clientY: 200 }); // 100px away - exceeds drag threshold
      });

      // Should NOT have cleared selection because it was a drag, not a click
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);
    });

    it('should handle click events for selection', () => {
      render(<Viewport />);
      const canvas = screen.getByTestId('viewport-canvas');

      // Set an initial selection
      act(() => {
        useSelectionStore.getState().setSelected(['test-entity']);
      });

      // Click on empty space (raycaster returns no hits)
      act(() => {
        fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
        fireEvent.mouseUp(canvas, { clientX: 50, clientY: 50 });
      });

      // Selection should be cleared (click on empty space)
      expect(useSelectionStore.getState().selectedIds).toEqual([]);
    });
  });

  describe('multi-select with modifier keys', () => {
    it('should not clear selection when Shift+clicking empty space', () => {
      // First set a selection
      act(() => {
        useSelectionStore.getState().setSelected(['existing-entity']);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);

      render(<Viewport />);
      const canvas = screen.getByTestId('viewport-canvas');

      // Shift+click on empty space - should NOT clear selection
      act(() => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100, shiftKey: true });
      });

      // Selection should remain unchanged
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);
    });

    it('should not clear selection when Ctrl+clicking empty space', () => {
      // First set a selection
      act(() => {
        useSelectionStore.getState().setSelected(['existing-entity']);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);

      render(<Viewport />);
      const canvas = screen.getByTestId('viewport-canvas');

      // Ctrl+click on empty space - should NOT clear selection
      act(() => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100, ctrlKey: true });
      });

      // Selection should remain unchanged
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);
    });

    it('should not clear selection when Cmd+clicking (metaKey) empty space', () => {
      // First set a selection
      act(() => {
        useSelectionStore.getState().setSelected(['existing-entity']);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);

      render(<Viewport />);
      const canvas = screen.getByTestId('viewport-canvas');

      // Cmd+click (metaKey) on empty space - should NOT clear selection
      act(() => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100, metaKey: true });
      });

      // Selection should remain unchanged
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);
    });

    it('should only respond to left-click for selection', () => {
      // First set a selection
      act(() => {
        useSelectionStore.getState().setSelected(['existing-entity']);
      });
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);

      render(<Viewport />);
      const canvas = screen.getByTestId('viewport-canvas');

      // Right-click should not trigger selection handling
      act(() => {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100, button: 2 });
        fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100, button: 2 });
      });

      // Selection should remain unchanged (right-click ignored)
      expect(useSelectionStore.getState().selectedIds).toEqual(['existing-entity']);
    });

  });
});
