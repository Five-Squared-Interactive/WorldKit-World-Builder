/**
 * Three.js Mesh Factory
 *
 * Creates Three.js mesh objects from entity definitions.
 * Maps entity types to appropriate geometries and applies transforms.
 */

import {
  BoxGeometry,
  SphereGeometry,
  PlaneGeometry,
  CylinderGeometry,
  CapsuleGeometry,
  TorusGeometry,
  ConeGeometry,
  TetrahedronGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Mesh,
  Material,
  Quaternion,
  Euler,
  Color,
  Shape,
  Path,
  ExtrudeGeometry,
} from 'three';
import { EntityType, Entity, DEFAULT_PRIMITIVE_COLOR } from '../../types/entity';

/**
 * Create a Three.js mesh from an entity
 * @param entity - The entity definition
 * @returns Mesh object or null if entity type is not renderable
 */
export function createThreeMesh(entity: Entity): Mesh | null {
  let geometry;

  switch (entity.type) {
    case EntityType.CubeMesh:
      // 1x1x1 cube
      geometry = new BoxGeometry(1, 1, 1);
      break;

    case EntityType.SphereMesh:
      // Radius 0.5, 32 width segments, 16 height segments for smoothness
      geometry = new SphereGeometry(0.5, 32, 16);
      break;

    case EntityType.PlaneMesh:
      // 2x2 plane
      geometry = new PlaneGeometry(2, 2);
      break;

    case EntityType.CylinderMesh:
      // Radius 0.5, height 1, 32 radial segments
      geometry = new CylinderGeometry(0.5, 0.5, 1, 32);
      break;

    case EntityType.CapsuleMesh:
      // Radius 0.25, cylindrical length 0.5, 8 cap segments, 16 radial segments
      geometry = new CapsuleGeometry(0.25, 0.5, 8, 16);
      break;

    case EntityType.TorusMesh:
      // Radius 0.35, tube radius 0.15, 16 radial segments, 32 tubular segments
      geometry = new TorusGeometry(0.35, 0.15, 16, 32);
      break;

    case EntityType.ConeMesh:
      // Radius 0.5, height 1, 32 radial segments
      geometry = new ConeGeometry(0.5, 1, 32);
      break;

    case EntityType.PyramidMesh:
      // Custom rectangular pyramid geometry (4-sided base)
      geometry = createPyramidGeometry();
      break;

    case EntityType.TetrahedronMesh:
      // Radius 0.5, detail 0
      geometry = new TetrahedronGeometry(0.5, 0);
      break;

    case EntityType.PrismMesh:
      // Custom triangular prism geometry
      geometry = createPrismGeometry();
      break;

    case EntityType.ArchMesh:
      // Custom arch geometry
      geometry = createArchGeometry();
      break;

    case EntityType.GltfMesh:
      // GLTF entities are loaded asynchronously, not here
      return null;

    default:
      // Entity type not renderable as a simple mesh
      return null;
  }

  // Create mesh with standard material (supports lighting)
  // Use entity color if specified, otherwise default gray
  const color = new Color(entity.color ?? DEFAULT_PRIMITIVE_COLOR);
  const material = new MeshStandardMaterial({ color });
  const mesh = new Mesh(geometry, material);

  // Store entity ID for selection/manipulation lookup
  mesh.userData.entityId = entity.id;

  // Apply transform from entity
  mesh.position.set(
    entity.transform.position.x,
    entity.transform.position.y,
    entity.transform.position.z
  );

  // For planes, compose horizontal orientation with entity rotation
  // This prevents overwriting user rotation when mesh.rotation.x is set
  if (entity.type === EntityType.PlaneMesh) {
    const horizontalQuat = new Quaternion();
    horizontalQuat.setFromEuler(new Euler(-Math.PI / 2, 0, 0));
    // Apply entity rotation on top of horizontal orientation
    mesh.quaternion.copy(horizontalQuat);
    mesh.quaternion.multiply(
      new Quaternion(
        entity.transform.rotation.x,
        entity.transform.rotation.y,
        entity.transform.rotation.z,
        entity.transform.rotation.w
      )
    );
  } else {
    mesh.quaternion.set(
      entity.transform.rotation.x,
      entity.transform.rotation.y,
      entity.transform.rotation.z,
      entity.transform.rotation.w
    );
  }

  mesh.scale.set(
    entity.transform.scale.x,
    entity.transform.scale.y,
    entity.transform.scale.z
  );

  // Enable shadow casting for all primitives
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Dispose of a mesh's geometry and materials to prevent memory leaks
 * @param mesh - The mesh to dispose
 */
export function disposeThreeMesh(mesh: Mesh): void {
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }

  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat: Material) => mat.dispose());
    } else {
      mesh.material.dispose();
    }
  }
}

/**
 * Create a rectangular pyramid geometry (4-sided base with apex)
 * Base is 1x1, height is 1
 */
function createPyramidGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();

  // Vertices: 4 base corners + 1 apex
  const vertices = new Float32Array([
    // Base vertices (y = -0.5)
    -0.5, -0.5, -0.5, // 0: front-left
    0.5, -0.5, -0.5, // 1: front-right
    0.5, -0.5, 0.5, // 2: back-right
    -0.5, -0.5, 0.5, // 3: back-left
    // Apex (y = 0.5)
    0, 0.5, 0, // 4: apex
  ]);

  // Indices for triangular faces
  const indices = [
    // Base (two triangles)
    0, 2, 1,
    0, 3, 2,
    // Front face
    0, 1, 4,
    // Right face
    1, 2, 4,
    // Back face
    2, 3, 4,
    // Left face
    3, 0, 4,
  ];

  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create a triangular prism geometry
 * Triangular cross-section, 1 unit tall
 */
function createPrismGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();

  const halfHeight = 0.5;
  const halfBase = 0.5;
  const apexY = 0.433; // Height of equilateral triangle (sqrt(3)/4)

  // Vertices: 3 bottom + 3 top
  const vertices = new Float32Array([
    // Bottom triangle (y = -0.5)
    -halfBase, -halfHeight, -0.25, // 0: front-left
    halfBase, -halfHeight, -0.25, // 1: front-right
    0, -halfHeight, apexY, // 2: back-center
    // Top triangle (y = 0.5)
    -halfBase, halfHeight, -0.25, // 3: front-left
    halfBase, halfHeight, -0.25, // 4: front-right
    0, halfHeight, apexY, // 5: back-center
  ]);

  // Indices for faces
  const indices = [
    // Bottom face
    0, 2, 1,
    // Top face
    3, 4, 5,
    // Front face (rectangle split into triangles)
    0, 1, 4,
    0, 4, 3,
    // Right face
    1, 2, 5,
    1, 5, 4,
    // Left face
    2, 0, 3,
    2, 3, 5,
  ];

  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create an arch geometry using ExtrudeGeometry
 * Pure semicircular arc (no pillars) with correct normals
 */
function createArchGeometry(): BufferGeometry {
  const outerRadius = 0.5;
  const thickness = 0.1;
  const innerRadius = outerRadius - thickness;
  const extrudeDepth = 0.2;

  // Create the arch shape - a semicircular ring
  const shape = new Shape();

  // Start at the bottom-left of the outer arc
  shape.moveTo(-outerRadius, 0);

  // Draw outer semicircular arc (left to right, counterclockwise)
  shape.absarc(0, 0, outerRadius, Math.PI, 0, true);

  // Line down to inner arc start (right side)
  shape.lineTo(innerRadius, 0);

  // Draw inner semicircular arc (right to left, clockwise)
  shape.absarc(0, 0, innerRadius, 0, Math.PI, false);

  // Close the shape (back to start)
  shape.lineTo(-outerRadius, 0);

  // Create extruded geometry
  const geometry = new ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: false,
  });

  // Center the geometry
  geometry.translate(0, 0, -extrudeDepth / 2);

  // Ensure normals are computed correctly
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Helper to create box vertices and indices
 */
function createBoxVertices(
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number
): { vertices: number[]; indices: number[] } {
  const halfDepth = depth / 2;

  const vertices = [
    // Front face
    x, y, -halfDepth, // 0
    x + width, y, -halfDepth, // 1
    x + width, y + height, -halfDepth, // 2
    x, y + height, -halfDepth, // 3
    // Back face
    x, y, halfDepth, // 4
    x + width, y, halfDepth, // 5
    x + width, y + height, halfDepth, // 6
    x, y + height, halfDepth, // 7
  ];

  const indices = [
    // Front
    0, 1, 2, 0, 2, 3,
    // Back
    5, 4, 7, 5, 7, 6,
    // Top
    3, 2, 6, 3, 6, 7,
    // Bottom
    4, 5, 1, 4, 1, 0,
    // Right
    1, 5, 6, 1, 6, 2,
    // Left
    4, 0, 3, 4, 3, 7,
  ];

  return { vertices, indices };
}
