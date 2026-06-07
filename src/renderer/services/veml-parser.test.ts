/**
 * VEML Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseVeml, validateVeml } from './veml-parser';
import { EntityType } from '../types/entity';

describe('veml-parser', () => {
  describe('parseVeml', () => {
    it('should parse a minimal VEML document', () => {
      const veml = `<?xml version="1.0" encoding="UTF-8"?>
<veml version="3.0">
  <meta><name>Test World</name></meta>
  <scene></scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      expect(result.metadata?.name).toBe('Test World');
      expect(result.entities).toEqual([]);
    });

    it('should parse metadata fields', () => {
      const veml = `<?xml version="1.0" encoding="UTF-8"?>
<veml version="3.0">
  <meta>
    <name>My World</name>
    <description>A test world</description>
    <author>Test Author</author>
    <created>2026-02-09T12:00:00Z</created>
    <generator>WorldKit 1.0.0</generator>
  </meta>
  <scene></scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      expect(result.metadata?.name).toBe('My World');
      expect(result.metadata?.description).toBe('A test world');
      expect(result.metadata?.author).toBe('Test Author');
      expect(result.metadata?.created).toBe('2026-02-09T12:00:00Z');
      expect(result.metadata?.generator).toBe('WorldKit 1.0.0');
    });

    it('should parse a cube entity', () => {
      const veml = `<?xml version="1.0" encoding="UTF-8"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene>
    <cube id="cube-1" name="My Cube" position="1 2 3" rotation="0 0 0 1" scale="2 2 2" />
  </scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      expect(result.entities).toHaveLength(1);

      const cube = result.entities?.[0];
      expect(cube?.id).toBe('cube-1');
      expect(cube?.name).toBe('My Cube');
      expect(cube?.type).toBe(EntityType.CubeMesh);
      expect(cube?.transform.position).toEqual({ x: 1, y: 2, z: 3 });
      expect(cube?.transform.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(cube?.transform.scale).toEqual({ x: 2, y: 2, z: 2 });
    });

    it('should parse different entity types', () => {
      const veml = `<?xml version="1.0" encoding="UTF-8"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene>
    <cube id="cube" name="Cube" />
    <sphere id="sphere" name="Sphere" />
    <plane id="plane" name="Plane" />
    <cylinder id="cyl" name="Cylinder" />
    <light id="light" name="Light" />
    <group id="group" name="Group" />
  </scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      expect(result.entities).toHaveLength(6);

      const types = result.entities?.map((e) => e.type);
      expect(types).toContain(EntityType.CubeMesh);
      expect(types).toContain(EntityType.SphereMesh);
      expect(types).toContain(EntityType.PlaneMesh);
      expect(types).toContain(EntityType.CylinderMesh);
      expect(types).toContain(EntityType.Light);
      expect(types).toContain(EntityType.Group);
    });

    it('should parse model entity with source', () => {
      const veml = `<?xml version="1.0" encoding="UTF-8"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene>
    <model id="model-1" name="My Model" src="assets/model.glb" />
  </scene>
</veml>`;

      const result = parseVeml(veml, '/path/to/project');

      expect(result.success).toBe(true);
      expect(result.entities).toHaveLength(1);

      const model = result.entities?.[0];
      expect(model?.type).toBe(EntityType.GltfMesh);
      expect(model?.modelPath).toBe('/path/to/project/assets/model.glb');
    });

    it('should parse nested entities', () => {
      const veml = `<?xml version="1.0" encoding="UTF-8"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene>
    <group id="parent" name="Parent">
      <cube id="child" name="Child" />
    </group>
  </scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      expect(result.entities).toHaveLength(2);

      const parent = result.entities?.find((e) => e.id === 'parent');
      const child = result.entities?.find((e) => e.id === 'child');

      expect(parent?.childIds).toContain('child');
      expect(child?.parentId).toBe('parent');
    });

    it('should parse visible attribute', () => {
      const veml = `<?xml version="1.0" encoding="UTF-8"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene>
    <cube id="visible-cube" name="Visible" />
    <cube id="hidden-cube" name="Hidden" visible="false" />
  </scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);

      const visible = result.entities?.find((e) => e.id === 'visible-cube');
      const hidden = result.entities?.find((e) => e.id === 'hidden-cube');

      expect(visible?.visible).toBe(true);
      expect(hidden?.visible).toBe(false);
    });

    it('should use defaults for missing transform attributes', () => {
      const veml = `<?xml version="1.0" encoding="UTF-8"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene>
    <cube id="cube" name="Cube" />
  </scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      const cube = result.entities?.[0];

      expect(cube?.transform.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(cube?.transform.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
      expect(cube?.transform.scale).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('should return error for invalid XML', () => {
      const veml = `<veml><not closed`;

      const result = parseVeml(veml);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid XML');
    });

    it('should return error for missing veml root element', () => {
      const veml = `<?xml version="1.0"?><root></root>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(false);
      expect(result.error).toContain('missing <veml> root element');
    });

    it('should return default name when metadata is missing', () => {
      const veml = `<?xml version="1.0"?>
<veml version="3.0">
  <scene></scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      expect(result.metadata?.name).toBe('Untitled World');
    });

    it('should generate IDs for entities without id attribute', () => {
      const veml = `<?xml version="1.0"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene>
    <cube name="No ID" />
  </scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      expect(result.entities?.[0]?.id).toBeTruthy();
    });

    it('should use tag name as entity name when name attribute is missing', () => {
      const veml = `<?xml version="1.0"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene>
    <cube id="cube-1" />
  </scene>
</veml>`;

      const result = parseVeml(veml);

      expect(result.success).toBe(true);
      expect(result.entities?.[0]?.name).toBe('cube');
    });
  });

  describe('validateVeml', () => {
    it('should validate correct VEML', () => {
      const veml = `<?xml version="1.0"?>
<veml version="3.0">
  <meta><name>Test</name></meta>
  <scene></scene>
</veml>`;

      const result = validateVeml(veml);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid XML syntax', () => {
      const veml = `<veml><not closed`;

      const result = validateVeml(veml);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid XML syntax');
    });

    it('should reject missing veml root element', () => {
      const veml = `<?xml version="1.0"?><root></root>`;

      const result = validateVeml(veml);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing <veml> root element');
    });

    it('should reject missing version attribute', () => {
      const veml = `<?xml version="1.0"?>
<veml>
  <scene></scene>
</veml>`;

      const result = validateVeml(veml);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing version attribute on <veml>');
    });
  });
});
