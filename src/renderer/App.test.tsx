import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import {
  useSceneStore,
  useSelectionStore,
  useUIStore,
  useCommandStore,
  useProjectStore,
} from './stores';

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
  // Reset all stores between tests
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

describe('App', () => {
  it('renders the editor layout', () => {
    render(<App />);
    expect(screen.getByTestId('editor-layout')).toBeInTheDocument();
  });

  it('renders the toolbar', () => {
    render(<App />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('renders all main panels', () => {
    render(<App />);
    expect(screen.getByTestId('scene-tree')).toBeInTheDocument();
    expect(screen.getByTestId('viewport')).toBeInTheDocument();
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    expect(screen.getByTestId('asset-library')).toBeInTheDocument();
  });

  it('displays the toolbar', () => {
    render(<App />);
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('displays the Preview button', () => {
    render(<App />);
    expect(screen.getByTestId('preview-button')).toBeInTheDocument();
  });

  it('displays panel headers', () => {
    render(<App />);
    expect(screen.getByText('Scene')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Asset Library')).toBeInTheDocument();
  });
});
