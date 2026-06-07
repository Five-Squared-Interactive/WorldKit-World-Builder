/**
 * VEML Serializer
 *
 * Converts WorldKit scene entities to VEML 3.0 XML format.
 * VEML (Virtual Environment Markup Language) is the file format
 * used by WebVerse Runtime.
 *
 * Schema reference: Specs/VEML/VEML.xsd
 */

import type { Entity, Transform } from '../types/entity';
import { EntityType } from '../types/entity';

/**
 * Format a number for VEML (fixed precision)
 */
function formatNumber(n: number): string {
  // Remove trailing zeros and unnecessary decimal points
  return parseFloat(n.toFixed(6)).toString();
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate transform XML elements
 */
function generateTransform(transform: Transform, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}<transform>`);
  lines.push(
    `${indent}  <position x="${formatNumber(transform.position.x)}" y="${formatNumber(transform.position.y)}" z="${formatNumber(transform.position.z)}" />`
  );
  lines.push(
    `${indent}  <rotation x="${formatNumber(transform.rotation.x)}" y="${formatNumber(transform.rotation.y)}" z="${formatNumber(transform.rotation.z)}" w="${formatNumber(transform.rotation.w)}" />`
  );
  lines.push(
    `${indent}  <scale x="${formatNumber(transform.scale.x)}" y="${formatNumber(transform.scale.y)}" z="${formatNumber(transform.scale.z)}" />`
  );
  lines.push(`${indent}</transform>`);
  return lines;
}

/**
 * Get VEML element name for entity type
 */
function getVemlElementName(type: EntityType): string {
  switch (type) {
    case EntityType.CubeMesh:
      return 'cubemesh';
    case EntityType.SphereMesh:
      return 'spheremesh';
    case EntityType.PlaneMesh:
      return 'planemesh';
    case EntityType.CylinderMesh:
      return 'cylindermesh';
    case EntityType.CapsuleMesh:
      return 'capsulemesh';
    case EntityType.TorusMesh:
      return 'torusmesh';
    case EntityType.ConeMesh:
      return 'conemesh';
    case EntityType.PyramidMesh:
      return 'rectangularpyramidmesh';
    case EntityType.TetrahedronMesh:
      return 'tetrahedronmesh';
    case EntityType.PrismMesh:
      return 'prismmesh';
    case EntityType.ArchMesh:
      return 'archmesh';
    case EntityType.GltfMesh:
      return 'mesh';
    case EntityType.Light:
      return 'light';
    case EntityType.Group:
      return 'container';
    case EntityType.Mesh:
    default:
      return 'container';
  }
}

/**
 * Default color for primitives
 */
const DEFAULT_COLOR = '#808080';

/**
 * Serialize a single entity to VEML XML
 */
function serializeEntity(
  entity: Entity,
  entities: Record<string, Entity>,
  indent: string = '      '
): string[] {
  const elementName = getVemlElementName(entity.type);
  const lines: string[] = [];

  // Build attributes
  const attrs: string[] = [];
  attrs.push(`tag="${escapeXml(entity.name)}"`);
  attrs.push(`id="${escapeXml(entity.id)}"`);

  // Opening tag
  lines.push(`${indent}<${elementName} ${attrs.join(' ')}>`);

  // Transform element
  lines.push(...generateTransform(entity.transform, indent + '  '));

  // Type-specific content
  switch (entity.type) {
    case EntityType.CubeMesh:
    case EntityType.SphereMesh:
    case EntityType.PlaneMesh:
    case EntityType.CylinderMesh:
    case EntityType.CapsuleMesh:
    case EntityType.TorusMesh:
    case EntityType.ConeMesh:
    case EntityType.PyramidMesh:
    case EntityType.TetrahedronMesh:
    case EntityType.PrismMesh:
    case EntityType.ArchMesh:
      // Primitives require a color element
      lines.push(`${indent}  <color>${DEFAULT_COLOR}</color>`);
      break;

    case EntityType.GltfMesh:
      // Mesh entities require mesh-name and mesh-resource
      if (entity.modelPath) {
        const fileName = entity.modelPath.split(/[/\\]/).pop() || 'model.glb';
        const meshName = fileName.replace(/\.[^.]+$/, ''); // Remove extension
        lines.push(`${indent}  <mesh-name>${escapeXml(meshName)}</mesh-name>`);
        lines.push(`${indent}  <mesh-resource>${escapeXml(fileName)}</mesh-resource>`);
      } else if (entity.modelData) {
        // For embedded data, use a generated name
        const meshName = entity.name.replace(/\s+/g, '_').toLowerCase();
        lines.push(`${indent}  <mesh-name>${escapeXml(meshName)}</mesh-name>`);
        // Note: Embedded base64 data cannot be directly used in mesh-resource
        // The runtime would need to support data URIs or the file needs to be extracted
        lines.push(
          `${indent}  <mesh-resource>data:model/gltf-binary;base64,${entity.modelData}</mesh-resource>`
        );
      }
      break;

    case EntityType.Light:
    case EntityType.Group:
    default:
      // These don't require additional elements
      break;
  }

  // Child entities
  const children = entity.childIds.map((id) => entities[id]).filter(Boolean);
  for (const child of children) {
    lines.push(...serializeEntity(child, entities, indent + '  '));
  }

  // Closing tag
  lines.push(`${indent}</${elementName}>`);

  return lines;
}

/**
 * Options for VEML serialization
 */
export interface VemlSerializeOptions {
  /** Project name/title */
  name?: string;
  /** Project description (not used in VEML, but kept for API compatibility) */
  description?: string;
  /** Project author (not used in VEML, but kept for API compatibility) */
  author?: string;
  /** Include XML declaration */
  includeXmlDeclaration?: boolean;
}

/**
 * Serialize scene entities to VEML XML string
 */
export function serializeToVeml(
  entities: Record<string, Entity>,
  rootIds: string[],
  options: VemlSerializeOptions = {}
): string {
  const { name = 'Untitled World', includeXmlDeclaration = true } = options;

  const lines: string[] = [];

  // XML declaration
  if (includeXmlDeclaration) {
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  }

  // VEML root element
  lines.push('<veml>');

  // Metadata section
  lines.push('  <metadata>');
  lines.push(`    <title>${escapeXml(name)}</title>`);
  lines.push('  </metadata>');

  // Environment section
  lines.push('  <environment>');

  // Background (required) - default to a simple color
  lines.push('    <background>');
  lines.push('      <color>#87CEEB</color>');
  lines.push('    </background>');

  // Root entities
  for (const rootId of rootIds) {
    const rootEntity = entities[rootId];
    if (rootEntity) {
      lines.push(...serializeEntity(rootEntity, entities, '    '));
    }
  }

  lines.push('  </environment>');
  lines.push('</veml>');

  return lines.join('\n');
}

/**
 * Get list of model files referenced by entities
 * Used to copy assets to the exported folder
 */
export function getReferencedModelFiles(entities: Record<string, Entity>): string[] {
  const modelPaths: string[] = [];

  for (const entity of Object.values(entities)) {
    if (entity.type === EntityType.GltfMesh && entity.modelPath) {
      if (!modelPaths.includes(entity.modelPath)) {
        modelPaths.push(entity.modelPath);
      }
    }
  }

  return modelPaths;
}
