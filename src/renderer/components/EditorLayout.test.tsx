import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EditorLayout } from './EditorLayout';
import {
  useSceneStore,
  useSelectionStore,
  useUIStore,
  useCommandStore,
  useProjectStore,
} from '../stores';

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  Panel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="panel" className={className}>{children}</div>
  ),
  Group: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="panel-group" className={className}>{children}</div>
  ),
  Separator: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="resize-handle" className={className}>{children}</div>
  ),
}));

// Mock Three.js to avoid WebGL context errors
vi.mock('three', () => {
  const mockCanvas = document.createElement('canvas');
  return {
    WebGLRenderer: class MockWebGLRenderer {
      domElement = mockCanvas;
      shadowMap = { enabled: false };
      setPixelRatio() {}
      setSize() {}
      render() {}
      dispose() {}
    },
    Scene: class MockScene {
      background: unknown = null;
      children: unknown[] = [];
      add() {}
      remove() {}
      traverse() {}
    },
    PerspectiveCamera: class MockPerspectiveCamera {
      position = { set: () => {}, x: 0, y: 0, z: 0 };
      aspect = 1;
      lookAt() {}
      updateProjectionMatrix() {}
    },
    GridHelper: class MockGridHelper {},
    AmbientLight: class MockAmbientLight {},
    DirectionalLight: class MockDirectionalLight {
      position = { set: () => {} };
      castShadow = false;
      shadow = { mapSize: { width: 0, height: 0 } };
    },
    Color: class MockColor {
      setHex() {}
      copy() {}
      getHex() { return 0x000000; }
    },
    Raycaster: class MockRaycaster {
      setFromCamera() {}
      intersectObjects() { return []; }
    },
    Vector2: class MockVector2 {
      x = 0;
      y = 0;
      set() { return this; }
    },
    Mesh: class MockMesh {
      userData = {};
      material = { emissive: { setHex() {}, copy() {}, getHex() { return 0; } }, emissiveIntensity: 0, dispose() {} };
      geometry = { dispose() {} };
    },
    BoxGeometry: class MockBoxGeometry { dispose() {} },
    SphereGeometry: class MockSphereGeometry { dispose() {} },
    CylinderGeometry: class MockCylinderGeometry { dispose() {} },
    PlaneGeometry: class MockPlaneGeometry { dispose() {} },
    MeshStandardMaterial: class MockMeshStandardMaterial {
      emissive = { setHex() {}, copy() {}, getHex() { return 0; } };
      emissiveIntensity = 0;
      dispose() {}
    },
    Quaternion: class MockQuaternion {
      x = 0;
      y = 0;
      z = 0;
      w = 1;
      setFromAxisAngle() { return this; }
      multiply() { return this; }
      setFromEuler() { return this; }
    },
    Euler: class MockEuler {
      x = 0;
      y = 0;
      z = 0;
      setFromQuaternion() { return this; }
    },
    Vector3: class MockVector3 { x = 0; y = 0; z = 0; },
  };
});

// Mock OrbitControls
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class MockOrbitControls {
    enableDamping = false;
    dampingFactor = 0;
    screenSpacePanning = false;
    minDistance = 0;
    maxDistance = 0;
    maxPolarAngle = 0;
    enabled = true;
    update() {}
    dispose() {}
  },
}));

// Mock TransformControls
vi.mock('three/addons/controls/TransformControls.js', () => ({
  TransformControls: class MockTransformControls {
    visible = false;
    enabled = false;
    object = null;
    attach() {}
    detach() {}
    dispose() {}
    setMode() {}
    setSize() {}
    getHelper() { return { type: 'Object3D' }; }
    addEventListener() {}
    removeEventListener() {}
  },
}));

// Mock window.worldkit
const mockSetTitle = vi.fn().mockResolvedValue(true);

// Mock requestAnimationFrame for Three.js
vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

beforeEach(() => {
  // Reset all stores
  useSceneStore.setState({ entities: {}, rootIds: [] });
  useSelectionStore.setState({ selectedIds: [] });
  useUIStore.getState().resetUI();
  useCommandStore.setState({ undoStack: [], redoStack: [], maxHistorySize: 100 });
  useProjectStore.getState().newProject();

  // Reset mocks
  mockSetTitle.mockClear();

  // Setup window.worldkit mock
  (window as unknown as { worldkit: unknown }).worldkit = {
    window: {
      setTitle: mockSetTitle,
    },
    network: {
      getStatus: vi.fn().mockResolvedValue({ online: true }),
      onStatusChange: vi.fn().mockReturnValue(() => {}),
    },
    webverse: {
      detect: vi.fn().mockResolvedValue({ installed: false }),
      getStatus: vi.fn().mockResolvedValue({ installed: false }),
    },
    project: {
      onNewProject: vi.fn().mockReturnValue(() => {}),
      onSaveTrigger: vi.fn().mockReturnValue(() => {}),
      onOpenTrigger: vi.fn().mockReturnValue(() => {}),
      onRecentUpdated: vi.fn().mockReturnValue(() => {}),
      onOpenRecent: vi.fn().mockReturnValue(() => {}),
    },
    scene: {
      onAddPrimitive: vi.fn().mockReturnValue(() => {}),
      onImportModel: vi.fn().mockReturnValue(() => {}),
    },
    export: {
      exportVeml: vi.fn().mockResolvedValue({ success: true }),
      onExportTrigger: vi.fn().mockReturnValue(() => {}),
    },
    view: {
      onToggleVemlCode: vi.fn().mockReturnValue(() => {}),
    },
    preview: {
      launch: vi.fn().mockResolvedValue({ success: true }),
      onStatusChange: vi.fn().mockReturnValue(() => {}),
      onTrigger: vi.fn().mockReturnValue(() => {}),
    },
  };
});

describe('EditorLayout', () => {
  describe('Layout Structure', () => {
    it('renders the editor layout container', () => {
      render(<EditorLayout />);
      expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
    });

    it('renders the toolbar', () => {
      render(<EditorLayout />);
      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });

    it('renders the scene tree panel', () => {
      render(<EditorLayout />);
      expect(screen.getByTestId('scene-tree')).toBeInTheDocument();
    });

    it('renders the viewport', () => {
      render(<EditorLayout />);
      expect(screen.getByTestId('viewport')).toBeInTheDocument();
    });

    it('renders the properties panel', () => {
      render(<EditorLayout />);
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    });

    it('renders the asset library', () => {
      render(<EditorLayout />);
      expect(screen.getByTestId('asset-library')).toBeInTheDocument();
    });
  });

  describe('Panel Headers', () => {
    it('displays Scene panel title', () => {
      render(<EditorLayout />);
      expect(screen.getByText('Scene')).toBeInTheDocument();
    });

    it('displays Properties panel title', () => {
      render(<EditorLayout />);
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    it('displays Asset Library panel title', () => {
      render(<EditorLayout />);
      expect(screen.getByText('Asset Library')).toBeInTheDocument();
    });
  });

  describe('Toolbar', () => {
    it('displays the toolbar', () => {
      render(<EditorLayout />);
      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });

    it('displays tool mode buttons', () => {
      render(<EditorLayout />);
      expect(screen.getByTitle('Select Tool')).toBeInTheDocument();
      expect(screen.getByTitle('Move Tool')).toBeInTheDocument();
      expect(screen.getByTitle('Rotate Tool')).toBeInTheDocument();
      expect(screen.getByTitle('Scale Tool')).toBeInTheDocument();
    });

    it('displays the preview button', () => {
      render(<EditorLayout />);
      expect(screen.getByTitle('Preview in WebVerse (F5)')).toBeInTheDocument();
    });
  });

  describe('Window Title Sync', () => {
    it('sets window title on mount', async () => {
      render(<EditorLayout />);

      await waitFor(() => {
        expect(mockSetTitle).toHaveBeenCalledWith('WorldKit World Builder - Untitled World');
      });
    });

    it('updates window title when project name changes', async () => {
      render(<EditorLayout />);

      // Wait for initial title
      await waitFor(() => {
        expect(mockSetTitle).toHaveBeenCalledWith('WorldKit World Builder - Untitled World');
      });

      // Change project name
      useProjectStore.getState().setProject({
        name: 'My World',
        path: null,
        lastSaved: null,
        description: '',
        author: '',
      });

      await waitFor(() => {
        expect(mockSetTitle).toHaveBeenCalledWith('WorldKit World Builder - My World');
      });
    });

    it('shows dirty indicator in title when project is dirty', async () => {
      render(<EditorLayout />);

      // Mark project as dirty
      useProjectStore.getState().markDirty();

      await waitFor(() => {
        expect(mockSetTitle).toHaveBeenCalledWith('WorldKit World Builder - Untitled World *');
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state for scene tree when no entities', () => {
      render(<EditorLayout />);
      expect(screen.getByText('No objects in scene')).toBeInTheDocument();
    });

    it('shows empty state for properties when no selection', () => {
      render(<EditorLayout />);
      expect(screen.getByText('No selection')).toBeInTheDocument();
    });
  });

  describe('Resizable Panel Layout', () => {
    it('has correct layout structure with resizable panels', () => {
      render(<EditorLayout />);
      const layout = screen.getByTestId('editor-layout');

      // Check that toolbar and main content area are present
      expect(layout.querySelector('.layout-toolbar')).toBeInTheDocument();
      expect(layout.querySelector('.layout-main')).toBeInTheDocument();

      // Check that panel wrappers exist
      expect(layout.querySelectorAll('.panel-wrapper').length).toBeGreaterThanOrEqual(4);

      // Check that resize handles exist (mocked with data-testid)
      expect(screen.getAllByTestId('resize-handle').length).toBeGreaterThanOrEqual(2);
    });
  });
});
