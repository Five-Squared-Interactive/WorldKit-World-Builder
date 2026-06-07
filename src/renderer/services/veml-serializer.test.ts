/**
 * VEML Serializer Tests
 *
 * Tests serialization to VEML 3.0 format per VEML.xsd schema
 */

import { describe, it, expect } from 'vitest';
import { serializeToVeml, getReferencedModelFiles } from './veml-serializer';
import { EntityType, createEntity } from '../types/entity';
import type { Entity } from '../types/entity';

describe('veml-serializer', () => {
  describe('serializeToVeml', () => {
    it('should serialize an empty scene with correct structure', () => {
      const result = serializeToVeml({}, [], { name: 'Test World' });

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<veml>');
      expect(result).toContain('<metadata>');
      expect(result).toContain('<title>Test World</title>');
      expect(result).toContain('</metadata>');
      expect(result).toContain('<environment>');
      expect(result).toContain('<background>');
      expect(result).toContain('</environment>');
      expect(result).toContain('</veml>');
    });

    it('should not include XML declaration when disabled', () => {
      const result = serializeToVeml({}, [], {
        includeXmlDeclaration: false,
      });

      expect(result).not.toContain('<?xml');
      expect(result).toMatch(/^<veml>/);
    });

    it('should serialize a cube entity with correct VEML format', () => {
      const cube: Entity = createEntity('cube-1', 'My Cube', EntityType.CubeMesh, {
        transform: {
          position: { x: 1, y: 2, z: 3 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });

      const entities = { [cube.id]: cube };
      const result = serializeToVeml(entities, [cube.id]);

      expect(result).toContain('<cubemesh');
      expect(result).toContain('tag="My Cube"');
      expect(result).toContain('id="cube-1"');
      expect(result).toContain('<transform>');
      expect(result).toContain('<position x="1" y="2" z="3"');
      expect(result).toContain('<rotation x="0" y="0" z="0" w="1"');
      expect(result).toContain('<scale x="1" y="1" z="1"');
      expect(result).toContain('</transform>');
      expect(result).toContain('<color>');
      expect(result).toContain('</cubemesh>');
    });

    it('should serialize different entity types correctly', () => {
      const sphere = createEntity('sphere-1', 'Sphere', EntityType.SphereMesh);
      const plane = createEntity('plane-1', 'Plane', EntityType.PlaneMesh);
      const cylinder = createEntity('cyl-1', 'Cylinder', EntityType.CylinderMesh);

      const entities = {
        [sphere.id]: sphere,
        [plane.id]: plane,
        [cylinder.id]: cylinder,
      };

      const result = serializeToVeml(entities, [sphere.id, plane.id, cylinder.id]);

      expect(result).toContain('<spheremesh');
      expect(result).toContain('<planemesh');
      expect(result).toContain('<cylindermesh');
    });

    it('should serialize new VEML primitive types correctly', () => {
      const capsule = createEntity('capsule-1', 'Capsule', EntityType.CapsuleMesh);
      const torus = createEntity('torus-1', 'Torus', EntityType.TorusMesh);
      const cone = createEntity('cone-1', 'Cone', EntityType.ConeMesh);
      const pyramid = createEntity('pyramid-1', 'Pyramid', EntityType.PyramidMesh);
      const tetrahedron = createEntity('tetra-1', 'Tetrahedron', EntityType.TetrahedronMesh);
      const prism = createEntity('prism-1', 'Prism', EntityType.PrismMesh);
      const arch = createEntity('arch-1', 'Arch', EntityType.ArchMesh);

      const entities = {
        [capsule.id]: capsule,
        [torus.id]: torus,
        [cone.id]: cone,
        [pyramid.id]: pyramid,
        [tetrahedron.id]: tetrahedron,
        [prism.id]: prism,
        [arch.id]: arch,
      };

      const result = serializeToVeml(
        entities,
        [capsule.id, torus.id, cone.id, pyramid.id, tetrahedron.id, prism.id, arch.id]
      );

      // VEML element names per schema
      expect(result).toContain('<capsulemesh');
      expect(result).toContain('<torusmesh');
      expect(result).toContain('<conemesh');
      expect(result).toContain('<rectangularpyramidmesh');
      expect(result).toContain('<tetrahedronmesh');
      expect(result).toContain('<prismmesh');
      expect(result).toContain('<archmesh');
    });

    it('should serialize capsule mesh with color element', () => {
      const capsule = createEntity('capsule-1', 'Test Capsule', EntityType.CapsuleMesh);

      const entities = { [capsule.id]: capsule };
      const result = serializeToVeml(entities, [capsule.id]);

      expect(result).toContain('<capsulemesh');
      expect(result).toContain('tag="Test Capsule"');
      expect(result).toContain('<color>');
      expect(result).toContain('</capsulemesh>');
    });

    it('should serialize GLTF mesh with mesh-name and mesh-resource', () => {
      const model: Entity = createEntity('model-1', 'My Model', EntityType.GltfMesh, {
        modelPath: 'C:/path/to/model.glb',
      });

      const entities = { [model.id]: model };
      const result = serializeToVeml(entities, [model.id]);

      expect(result).toContain('<mesh');
      expect(result).toContain('<mesh-name>model</mesh-name>');
      expect(result).toContain('<mesh-resource>model.glb</mesh-resource>');
      expect(result).toContain('</mesh>');
    });

    it('should serialize GLTF mesh with embedded data', () => {
      const model: Entity = createEntity('model-1', 'Door', EntityType.GltfMesh, {
        modelData: 'SGVsbG8gV29ybGQ=', // base64 encoded
      });

      const entities = { [model.id]: model };
      const result = serializeToVeml(entities, [model.id]);

      expect(result).toContain('<mesh');
      expect(result).toContain('<mesh-name>door</mesh-name>');
      expect(result).toContain('<mesh-resource>data:model/gltf-binary;base64,SGVsbG8gV29ybGQ=</mesh-resource>');
    });

    it('should serialize nested entities', () => {
      const parent: Entity = {
        ...createEntity('parent', 'Parent', EntityType.Group),
        childIds: ['child'],
      };
      const child: Entity = {
        ...createEntity('child', 'Child', EntityType.CubeMesh),
        parentId: 'parent',
      };

      const entities = {
        [parent.id]: parent,
        [child.id]: child,
      };

      const result = serializeToVeml(entities, [parent.id]);

      expect(result).toContain('<container');
      expect(result).toContain('</container>');
      expect(result).toContain('<cubemesh');
    });

    it('should escape XML special characters', () => {
      const entity = createEntity('test', 'Entity <with> & "special" chars', EntityType.CubeMesh);

      const entities = { [entity.id]: entity };
      const result = serializeToVeml(entities, [entity.id]);

      expect(result).toContain('&lt;with&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;special&quot;');
    });

    it('should format numbers without unnecessary decimals', () => {
      const entity = createEntity('test', 'Test', EntityType.CubeMesh, {
        transform: {
          position: { x: 1.5, y: 2.0, z: 3.123456789 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
        },
      });

      const entities = { [entity.id]: entity };
      const result = serializeToVeml(entities, [entity.id]);

      expect(result).toContain('x="1.5"');
      expect(result).toContain('y="2"');
      expect(result).toContain('z="3.123457"');
    });

    it('should serialize light entities', () => {
      const light = createEntity('light-1', 'Sun', EntityType.Light);

      const entities = { [light.id]: light };
      const result = serializeToVeml(entities, [light.id]);

      expect(result).toContain('<light');
      expect(result).toContain('tag="Sun"');
      expect(result).toContain('</light>');
    });
  });

  describe('getReferencedModelFiles', () => {
    it('should return empty array for scene without models', () => {
      const cube = createEntity('cube', 'Cube', EntityType.CubeMesh);
      const entities = { [cube.id]: cube };

      const result = getReferencedModelFiles(entities);

      expect(result).toEqual([]);
    });

    it('should return model paths for GLTF entities', () => {
      const model1: Entity = createEntity('model1', 'Model 1', EntityType.GltfMesh, {
        modelPath: 'C:/path/to/model1.glb',
      });
      const model2: Entity = createEntity('model2', 'Model 2', EntityType.GltfMesh, {
        modelPath: 'C:/path/to/model2.gltf',
      });

      const entities = {
        [model1.id]: model1,
        [model2.id]: model2,
      };

      const result = getReferencedModelFiles(entities);

      expect(result).toHaveLength(2);
      expect(result).toContain('C:/path/to/model1.glb');
      expect(result).toContain('C:/path/to/model2.gltf');
    });

    it('should not include duplicate paths', () => {
      const model1: Entity = createEntity('model1', 'Model 1', EntityType.GltfMesh, {
        modelPath: 'C:/path/to/model.glb',
      });
      const model2: Entity = createEntity('model2', 'Model 2', EntityType.GltfMesh, {
        modelPath: 'C:/path/to/model.glb',
      });

      const entities = {
        [model1.id]: model1,
        [model2.id]: model2,
      };

      const result = getReferencedModelFiles(entities);

      expect(result).toHaveLength(1);
      expect(result).toContain('C:/path/to/model.glb');
    });

    it('should skip GLTF entities without modelPath', () => {
      const model: Entity = createEntity('model', 'Model', EntityType.GltfMesh);
      // modelPath is undefined

      const entities = { [model.id]: model };

      const result = getReferencedModelFiles(entities);

      expect(result).toEqual([]);
    });
  });
});
