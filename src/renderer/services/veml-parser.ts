/**
 * VEML Parser
 *
 * Parses VEML 3.0 XML format back into WorldKit entities.
 * Used when opening saved projects.
 */

import type { Entity, Transform, Vector3, Quaternion } from '../types/entity';
import { EntityType, createEntity } from '../types/entity';

/**
 * Parsed VEML metadata
 */
export interface VemlMetadata {
  name: string;
  description?: string;
  author?: string;
  created?: string;
  generator?: string;
}

/**
 * Result of parsing a VEML file
 */
export interface ParseVemlResult {
  success: boolean;
  metadata?: VemlMetadata;
  entities?: Entity[];
  error?: string;
}

/**
 * Parse a space-separated vector string into Vector3
 */
function parseVector3(str: string): Vector3 {
  const parts = str.trim().split(/\s+/).map(Number);
  return {
    x: parts[0] || 0,
    y: parts[1] || 0,
    z: parts[2] || 0,
  };
}

/**
 * Parse a space-separated quaternion string into Quaternion
 */
function parseQuaternion(str: string): Quaternion {
  const parts = str.trim().split(/\s+/).map(Number);
  return {
    x: parts[0] || 0,
    y: parts[1] || 0,
    z: parts[2] || 0,
    w: parts[3] ?? 1,
  };
}

/**
 * Get entity type from VEML tag name
 */
function getEntityType(tagName: string): EntityType {
  switch (tagName.toLowerCase()) {
    case 'cube':
      return EntityType.CubeMesh;
    case 'sphere':
      return EntityType.SphereMesh;
    case 'plane':
      return EntityType.PlaneMesh;
    case 'cylinder':
      return EntityType.CylinderMesh;
    case 'model':
      return EntityType.GltfMesh;
    case 'light':
      return EntityType.Light;
    case 'group':
      return EntityType.Group;
    case 'mesh':
    default:
      return EntityType.Mesh;
  }
}

/**
 * Check if a tag name represents an entity
 */
function isEntityTag(tagName: string): boolean {
  const entityTags = ['cube', 'sphere', 'plane', 'cylinder', 'model', 'light', 'group', 'mesh'];
  return entityTags.includes(tagName.toLowerCase());
}

/**
 * Parse an entity element and its children
 */
function parseEntityElement(
  element: Element,
  parentId: string | null,
  projectPath: string
): Entity[] {
  const entities: Entity[] = [];

  const id = element.getAttribute('id') || crypto.randomUUID();
  const name = element.getAttribute('name') || element.tagName;

  // Parse transform
  const positionStr = element.getAttribute('position') || '0 0 0';
  const rotationStr = element.getAttribute('rotation') || '0 0 0 1';
  const scaleStr = element.getAttribute('scale') || '1 1 1';

  const transform: Transform = {
    position: parseVector3(positionStr),
    rotation: parseQuaternion(rotationStr),
    scale: parseVector3(scaleStr),
  };

  // Parse visibility
  const visibleStr = element.getAttribute('visible');
  const visible = visibleStr !== 'false';

  // Parse model source for GLTF entities
  let modelPath: string | undefined;
  const srcAttr = element.getAttribute('src');
  if (srcAttr && element.tagName.toLowerCase() === 'model') {
    // Convert relative path to absolute path within project
    if (srcAttr.startsWith('assets/')) {
      modelPath = `${projectPath}/${srcAttr}`;
    } else {
      modelPath = srcAttr;
    }
  }

  // Find child entity elements
  const childIds: string[] = [];
  const childElements: Element[] = [];

  for (const child of Array.from(element.children)) {
    if (isEntityTag(child.tagName)) {
      childElements.push(child);
    }
  }

  // Create the entity
  const entity: Entity = {
    ...createEntity(id, name, getEntityType(element.tagName)),
    transform,
    visible,
    parentId,
    childIds: [], // Will be populated after parsing children
    modelPath,
  };

  entities.push(entity);

  // Parse child entities recursively
  for (const childElement of childElements) {
    const childEntities = parseEntityElement(childElement, id, projectPath);
    if (childEntities.length > 0) {
      childIds.push(childEntities[0].id);
      entities.push(...childEntities);
    }
  }

  // Update parent's childIds
  entity.childIds = childIds;

  return entities;
}

/**
 * Parse metadata from VEML document
 */
function parseMetadata(doc: Document): VemlMetadata {
  const metaElement = doc.querySelector('meta');

  if (!metaElement) {
    return { name: 'Untitled World' };
  }

  return {
    name: metaElement.querySelector('name')?.textContent || 'Untitled World',
    description: metaElement.querySelector('description')?.textContent || undefined,
    author: metaElement.querySelector('author')?.textContent || undefined,
    created: metaElement.querySelector('created')?.textContent || undefined,
    generator: metaElement.querySelector('generator')?.textContent || undefined,
  };
}

/**
 * Parse VEML XML string into entities and metadata
 */
export function parseVeml(xmlContent: string, projectPath: string = ''): ParseVemlResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: `Invalid XML: ${parseError.textContent}`,
      };
    }

    // Verify it's a VEML document
    const vemlElement = doc.querySelector('veml');
    if (!vemlElement) {
      return {
        success: false,
        error: 'Not a valid VEML file: missing <veml> root element',
      };
    }

    // Parse metadata
    const metadata = parseMetadata(doc);

    // Parse entities from scene
    const sceneElement = doc.querySelector('scene');
    if (!sceneElement) {
      return {
        success: true,
        metadata,
        entities: [],
      };
    }

    const entities: Entity[] = [];

    // Parse all root-level entity elements in scene
    for (const child of Array.from(sceneElement.children)) {
      if (isEntityTag(child.tagName)) {
        const entityGroup = parseEntityElement(child, null, projectPath);
        entities.push(...entityGroup);
      }
    }

    return {
      success: true,
      metadata,
      entities,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse VEML',
    };
  }
}

/**
 * Validate VEML content without fully parsing
 * Returns true if the content appears to be valid VEML
 */
export function validateVeml(xmlContent: string): { valid: boolean; error?: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { valid: false, error: 'Invalid XML syntax' };
    }

    // Verify VEML root element
    const vemlElement = doc.querySelector('veml');
    if (!vemlElement) {
      return { valid: false, error: 'Missing <veml> root element' };
    }

    // Check version attribute
    const version = vemlElement.getAttribute('version');
    if (!version) {
      return { valid: false, error: 'Missing version attribute on <veml>' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Failed to parse XML' };
  }
}
