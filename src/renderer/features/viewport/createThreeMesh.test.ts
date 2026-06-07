/**
 * Three.js Mesh Factory Tests
 *
 * Tests for creating Three.js meshes from entity definitions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityType, createEntity } from '../../types/entity';
import { createThreeMesh, disposeThreeMesh } from './createThreeMesh';
import type { Mesh } from 'three';

// Create mock instances that track constructor calls
const mockGeometryInstances: { dispose: ReturnType<typeof vi.fn> }[] = [];
const mockMaterialInstances: { dispose: ReturnType<typeof vi.fn> }[] = [];
const mockMeshInstances: {
  userData: Record<string, unknown>;
  position: { set: ReturnType<typeof vi.fn> };
  quaternion: { set: ReturnType<typeof vi.fn> };
  scale: { set: ReturnType<typeof vi.fn> };
  rotation: { x: number };
  castShadow: boolean;
  receiveShadow: boolean;
  geometry: { dispose: ReturnType<typeof vi.fn> };
  material: { dispose: ReturnType<typeof vi.fn> };
}[] = [];

// Mock Three.js using vi.hoisted
const mocks = vi.hoisted(() => {
  return {
    BoxGeometry: vi.fn(),
    SphereGeometry: vi.fn(),
    PlaneGeometry: vi.fn(),
    CylinderGeometry: vi.fn(),
    CapsuleGeometry: vi.fn(),
    TorusGeometry: vi.fn(),
    ConeGeometry: vi.fn(),
    TetrahedronGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(),
    Mesh: vi.fn(),
    BufferGeometry: vi.fn(),
    ExtrudeGeometry: vi.fn(),
  };
});

vi.mock('three', () => {
  // Use class syntax for proper constructors
  class MockBoxGeometry {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.BoxGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockSphereGeometry {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.SphereGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockPlaneGeometry {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.PlaneGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockCylinderGeometry {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.CylinderGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockCapsuleGeometry {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.CapsuleGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockTorusGeometry {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.TorusGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockConeGeometry {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.ConeGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockTetrahedronGeometry {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.TetrahedronGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockBufferGeometry {
    dispose = vi.fn();
    setAttribute = vi.fn();
    setIndex = vi.fn();
    computeVertexNormals = vi.fn();
    constructor(...args: unknown[]) {
      mocks.BufferGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockShape {
    holes: MockPath[] = [];
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    absarc = vi.fn().mockReturnThis();
  }

  class MockPath {
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    absarc = vi.fn().mockReturnThis();
  }

  class MockExtrudeGeometry {
    dispose = vi.fn();
    translate = vi.fn().mockReturnThis();
    computeVertexNormals = vi.fn();
    constructor(...args: unknown[]) {
      mocks.ExtrudeGeometry(...args);
      mockGeometryInstances.push(this);
    }
  }

  class MockMeshStandardMaterial {
    dispose = vi.fn();
    constructor(...args: unknown[]) {
      mocks.MeshStandardMaterial(...args);
      mockMaterialInstances.push(this);
    }
  }

  class MockQuaternion {
    x = 0;
    y = 0;
    z = 0;
    w = 1;
    set = vi.fn(function(this: MockQuaternion, x: number, y: number, z: number, w: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
      return this;
    });
    setFromEuler = vi.fn().mockReturnThis();
    copy = vi.fn().mockReturnThis();
    multiply = vi.fn().mockReturnThis();
    constructor(x?: number, y?: number, z?: number, w?: number) {
      if (x !== undefined) this.x = x;
      if (y !== undefined) this.y = y;
      if (z !== undefined) this.z = z;
      if (w !== undefined) this.w = w;
    }
  }

  class MockEuler {
    x = 0;
    y = 0;
    z = 0;
    constructor(x?: number, y?: number, z?: number) {
      if (x !== undefined) this.x = x;
      if (y !== undefined) this.y = y;
      if (z !== undefined) this.z = z;
    }
  }

  class MockColor {
    r = 0;
    g = 0;
    b = 0;
    constructor(color?: string | number) {
      // Simple hex parsing for tests
      if (typeof color === 'string' && color.startsWith('#')) {
        const hex = parseInt(color.slice(1), 16);
        this.r = ((hex >> 16) & 255) / 255;
        this.g = ((hex >> 8) & 255) / 255;
        this.b = (hex & 255) / 255;
      } else if (typeof color === 'number') {
        this.r = ((color >> 16) & 255) / 255;
        this.g = ((color >> 8) & 255) / 255;
        this.b = (color & 255) / 255;
      }
    }
  }

  class MockMesh {
    userData: Record<string, unknown> = {};
    position = { set: vi.fn() };
    quaternion = new MockQuaternion();
    scale = { set: vi.fn() };
    rotation = { x: 0 };
    castShadow = false;
    receiveShadow = false;
    geometry: { dispose: ReturnType<typeof vi.fn> };
    material: { dispose: ReturnType<typeof vi.fn> };

    constructor(geometry: { dispose: ReturnType<typeof vi.fn> }, material: { dispose: ReturnType<typeof vi.fn> }) {
      mocks.Mesh(geometry, material);
      this.geometry = geometry;
      this.material = material;
      mockMeshInstances.push(this);
    }
  }

  return {
    BoxGeometry: MockBoxGeometry,
    SphereGeometry: MockSphereGeometry,
    PlaneGeometry: MockPlaneGeometry,
    CylinderGeometry: MockCylinderGeometry,
    CapsuleGeometry: MockCapsuleGeometry,
    TorusGeometry: MockTorusGeometry,
    ConeGeometry: MockConeGeometry,
    TetrahedronGeometry: MockTetrahedronGeometry,
    BufferGeometry: MockBufferGeometry,
    MeshStandardMaterial: MockMeshStandardMaterial,
    Mesh: MockMesh,
    Quaternion: MockQuaternion,
    Euler: MockEuler,
    Color: MockColor,
    Float32BufferAttribute: vi.fn(),
    Shape: MockShape,
    Path: MockPath,
    ExtrudeGeometry: MockExtrudeGeometry,
  };
});

describe('createThreeMesh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGeometryInstances.length = 0;
    mockMaterialInstances.length = 0;
    mockMeshInstances.length = 0;
  });

  describe('for CubeMesh entity', () => {
    it('should create BoxGeometry with 1x1x1 dimensions', () => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
      createThreeMesh(entity);

      expect(mocks.BoxGeometry).toHaveBeenCalledWith(1, 1, 1);
    });

    it('should create MeshStandardMaterial with default gray color', () => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
      createThreeMesh(entity);

      // MeshStandardMaterial is called with a Color object
      expect(mocks.MeshStandardMaterial).toHaveBeenCalled();
      const callArgs = mocks.MeshStandardMaterial.mock.calls[0][0];
      expect(callArgs.color).toBeDefined();
    });

    it('should create Mesh with geometry and material', () => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
      createThreeMesh(entity);

      expect(mocks.Mesh).toHaveBeenCalled();
      expect(mockMeshInstances.length).toBe(1);
    });

    it('should store entity ID in userData', () => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
      const mesh = createThreeMesh(entity);

      expect(mesh?.userData.entityId).toBe('test-id');
    });

    it('should apply position transform', () => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh, {
        transform: {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });
      const mesh = createThreeMesh(entity);

      expect(mesh?.position.set).toHaveBeenCalledWith(1, 2, 3);
    });

    it('should apply rotation transform as quaternion for non-plane entities', () => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh, {
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0.1, y: 0.2, z: 0.3, w: 0.9 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });
      createThreeMesh(entity);

      expect(mockMeshInstances[0].quaternion.x).toBe(0.1);
      expect(mockMeshInstances[0].quaternion.y).toBe(0.2);
      expect(mockMeshInstances[0].quaternion.z).toBe(0.3);
      expect(mockMeshInstances[0].quaternion.w).toBe(0.9);
    });

    it('should apply scale transform', () => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh, {
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 2, y: 3, z: 4 },
        },
      });
      const mesh = createThreeMesh(entity);

      expect(mesh?.scale.set).toHaveBeenCalledWith(2, 3, 4);
    });

    it('should enable shadow casting', () => {
      const entity = createEntity('test-id', 'Test Cube', EntityType.CubeMesh);
      const mesh = createThreeMesh(entity);

      expect(mesh?.castShadow).toBe(true);
      expect(mesh?.receiveShadow).toBe(true);
    });
  });

  describe('for SphereMesh entity', () => {
    it('should create SphereGeometry with radius 0.5 and adequate segments', () => {
      const entity = createEntity('test-id', 'Test Sphere', EntityType.SphereMesh);
      createThreeMesh(entity);

      expect(mocks.SphereGeometry).toHaveBeenCalledWith(0.5, 32, 16);
    });
  });

  describe('for PlaneMesh entity', () => {
    it('should create PlaneGeometry with 2x2 dimensions', () => {
      const entity = createEntity('test-id', 'Test Plane', EntityType.PlaneMesh);
      createThreeMesh(entity);

      expect(mocks.PlaneGeometry).toHaveBeenCalledWith(2, 2);
    });

    it('should compose horizontal orientation with entity rotation', () => {
      const entity = createEntity('test-id', 'Test Plane', EntityType.PlaneMesh);
      const mesh = createThreeMesh(entity);

      // For planes, quaternion uses copy + multiply to compose rotations
      // This prevents overwriting user rotation when using rotation.x
      expect(mesh?.quaternion.copy).toHaveBeenCalled();
      expect(mesh?.quaternion.multiply).toHaveBeenCalled();
      // set() should NOT be called for planes (it would overwrite the composed rotation)
      expect(mesh?.quaternion.set).not.toHaveBeenCalled();
    });
  });

  describe('for CylinderMesh entity', () => {
    it('should create CylinderGeometry with radius 0.5 and height 1', () => {
      const entity = createEntity('test-id', 'Test Cylinder', EntityType.CylinderMesh);
      createThreeMesh(entity);

      expect(mocks.CylinderGeometry).toHaveBeenCalledWith(0.5, 0.5, 1, 32);
    });
  });

  describe('for CapsuleMesh entity (VEML primitive)', () => {
    it('should create CapsuleGeometry with radius 0.25 and length 0.5', () => {
      const entity = createEntity('test-id', 'Test Capsule', EntityType.CapsuleMesh);
      createThreeMesh(entity);

      // Capsule: radius 0.25, cylindrical length 0.5, capSegments, radialSegments
      expect(mocks.CapsuleGeometry).toHaveBeenCalledWith(0.25, 0.5, 8, 16);
    });

    it('should return a valid mesh for CapsuleMesh', () => {
      const entity = createEntity('test-id', 'Test Capsule', EntityType.CapsuleMesh);
      const mesh = createThreeMesh(entity);

      expect(mesh).not.toBeNull();
      expect(mesh?.userData.entityId).toBe('test-id');
    });
  });

  describe('for TorusMesh entity (VEML primitive)', () => {
    it('should create TorusGeometry with outer radius 0.5 and tube radius 0.15', () => {
      const entity = createEntity('test-id', 'Test Torus', EntityType.TorusMesh);
      createThreeMesh(entity);

      // Torus: radius, tube, radialSegments, tubularSegments
      expect(mocks.TorusGeometry).toHaveBeenCalledWith(0.35, 0.15, 16, 32);
    });

    it('should return a valid mesh for TorusMesh', () => {
      const entity = createEntity('test-id', 'Test Torus', EntityType.TorusMesh);
      const mesh = createThreeMesh(entity);

      expect(mesh).not.toBeNull();
      expect(mesh?.userData.entityId).toBe('test-id');
    });
  });

  describe('for ConeMesh entity (VEML primitive)', () => {
    it('should create ConeGeometry with radius 0.5 and height 1', () => {
      const entity = createEntity('test-id', 'Test Cone', EntityType.ConeMesh);
      createThreeMesh(entity);

      // Cone: radius, height, radialSegments
      expect(mocks.ConeGeometry).toHaveBeenCalledWith(0.5, 1, 32);
    });

    it('should return a valid mesh for ConeMesh', () => {
      const entity = createEntity('test-id', 'Test Cone', EntityType.ConeMesh);
      const mesh = createThreeMesh(entity);

      expect(mesh).not.toBeNull();
      expect(mesh?.userData.entityId).toBe('test-id');
    });
  });

  describe('for PyramidMesh entity (VEML rectangularpyramidmesh)', () => {
    it('should create a custom pyramid geometry', () => {
      const entity = createEntity('test-id', 'Test Pyramid', EntityType.PyramidMesh);
      const mesh = createThreeMesh(entity);

      // Pyramid uses custom BufferGeometry
      expect(mesh).not.toBeNull();
      expect(mesh?.userData.entityId).toBe('test-id');
    });
  });

  describe('for TetrahedronMesh entity (VEML primitive)', () => {
    it('should create TetrahedronGeometry with radius 0.5', () => {
      const entity = createEntity('test-id', 'Test Tetrahedron', EntityType.TetrahedronMesh);
      createThreeMesh(entity);

      expect(mocks.TetrahedronGeometry).toHaveBeenCalledWith(0.5, 0);
    });

    it('should return a valid mesh for TetrahedronMesh', () => {
      const entity = createEntity('test-id', 'Test Tetrahedron', EntityType.TetrahedronMesh);
      const mesh = createThreeMesh(entity);

      expect(mesh).not.toBeNull();
      expect(mesh?.userData.entityId).toBe('test-id');
    });
  });

  describe('for PrismMesh entity (VEML primitive)', () => {
    it('should create a custom triangular prism geometry', () => {
      const entity = createEntity('test-id', 'Test Prism', EntityType.PrismMesh);
      const mesh = createThreeMesh(entity);

      // Prism uses custom BufferGeometry
      expect(mesh).not.toBeNull();
      expect(mesh?.userData.entityId).toBe('test-id');
    });
  });

  describe('for ArchMesh entity (VEML primitive)', () => {
    it('should create arch geometry using ExtrudeGeometry', () => {
      const entity = createEntity('test-id', 'Test Arch', EntityType.ArchMesh);
      const mesh = createThreeMesh(entity);

      // Arch uses ExtrudeGeometry for proper geometry
      expect(mocks.ExtrudeGeometry).toHaveBeenCalled();
      expect(mesh).not.toBeNull();
      expect(mesh?.userData.entityId).toBe('test-id');
    });

    it('should return a valid mesh for ArchMesh', () => {
      const entity = createEntity('test-id', 'Test Arch', EntityType.ArchMesh);
      const mesh = createThreeMesh(entity);

      expect(mesh).not.toBeNull();
      expect(mesh?.userData.entityId).toBe('test-id');
    });
  });

  describe('for unsupported entity types', () => {
    it('should return null for Group entity', () => {
      const entity = createEntity('test-id', 'Test Group', EntityType.Group);
      const mesh = createThreeMesh(entity);

      expect(mesh).toBeNull();
    });

    it('should return null for Light entity', () => {
      const entity = createEntity('test-id', 'Test Light', EntityType.Light);
      const mesh = createThreeMesh(entity);

      expect(mesh).toBeNull();
    });
  });
});

describe('disposeThreeMesh', () => {
  it('should dispose geometry', () => {
    const mockGeometry = { dispose: vi.fn() };
    const mockMaterial = { dispose: vi.fn() };
    const mesh = {
      geometry: mockGeometry,
      material: mockMaterial,
    } as unknown as Mesh;

    disposeThreeMesh(mesh);

    expect(mockGeometry.dispose).toHaveBeenCalled();
  });

  it('should dispose single material', () => {
    const mockGeometry = { dispose: vi.fn() };
    const mockMaterial = { dispose: vi.fn() };
    const mesh = {
      geometry: mockGeometry,
      material: mockMaterial,
    } as unknown as Mesh;

    disposeThreeMesh(mesh);

    expect(mockMaterial.dispose).toHaveBeenCalled();
  });

  it('should dispose array of materials', () => {
    const mockGeometry = { dispose: vi.fn() };
    const mockMaterial1 = { dispose: vi.fn() };
    const mockMaterial2 = { dispose: vi.fn() };
    const mesh = {
      geometry: mockGeometry,
      material: [mockMaterial1, mockMaterial2],
    } as unknown as Mesh;

    disposeThreeMesh(mesh);

    expect(mockMaterial1.dispose).toHaveBeenCalled();
    expect(mockMaterial2.dispose).toHaveBeenCalled();
  });
});
