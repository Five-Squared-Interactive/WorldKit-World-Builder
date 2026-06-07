/**
 * Template Handlers
 *
 * IPC handlers for world template operations.
 * Manages listing and loading bundled templates.
 */

import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateChannels } from '../../shared/ipc-channels';
import type {
  TemplateInfo,
  TemplateData,
  ListTemplatesResult,
  LoadTemplateResult,
} from '../../shared/types/template';
import type { Entity } from '../../renderer/types/entity';
import { EntityType } from '../../renderer/types/entity';

/**
 * Built-in template definitions
 */
const BUNDLED_TEMPLATES: TemplateInfo[] = [
  {
    id: 'empty',
    name: 'Empty World',
    description: 'Start with a blank canvas - just a ground plane and ambient lighting.',
    thumbnail: 'templates/empty-thumb.png',
    templatePath: 'templates/empty.json',
  },
  {
    id: 'room',
    name: 'Room Interior',
    description: 'A simple indoor room with walls, floor, and basic furniture placeholders.',
    thumbnail: 'templates/room-thumb.png',
    templatePath: 'templates/room.json',
  },
  {
    id: 'park',
    name: 'Outdoor Park',
    description: 'An outdoor environment with grass, paths, and nature elements.',
    thumbnail: 'templates/park-thumb.png',
    templatePath: 'templates/park.json',
  },
  {
    id: 'gallery',
    name: 'Gallery Space',
    description: 'A museum-style gallery with display pedestals and wall frames.',
    thumbnail: 'templates/gallery-thumb.png',
    templatePath: 'templates/gallery.json',
  },
];

/**
 * Get the resources path (works in both dev and production)
 */
function getResourcesPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'resources');
  }
  return path.join(__dirname, '../../resources');
}

/**
 * Load a template file and parse its entities
 */
function loadTemplateFile(templatePath: string): Entity[] | null {
  try {
    const fullPath = path.join(getResourcesPath(), templatePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`[template] Template file not found: ${fullPath}`);
      return null;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(content);

    // Validate and return entities
    if (Array.isArray(data.entities)) {
      return data.entities as Entity[];
    }

    console.warn(`[template] Invalid template format: missing entities array`);
    return null;
  } catch (error) {
    console.error(`[template] Error loading template: ${error}`);
    return null;
  }
}

/**
 * Register template IPC handlers
 */
export function registerTemplateHandlers(): void {
  // List available templates
  ipcMain.handle(TemplateChannels.LIST, (): ListTemplatesResult => {
    try {
      // Return the bundled template info
      // In the future, this could also scan for user-created templates
      return {
        success: true,
        templates: BUNDLED_TEMPLATES,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list templates',
      };
    }
  });

  // Load a template by ID
  ipcMain.handle(TemplateChannels.LOAD, (_event, templateId: string): LoadTemplateResult => {
    try {
      // Find the template info
      const info = BUNDLED_TEMPLATES.find((t) => t.id === templateId);

      if (!info) {
        return {
          success: false,
          error: `Template not found: ${templateId}`,
        };
      }

      // Load the template entities
      const entities = loadTemplateFile(info.templatePath);

      if (!entities) {
        // If template file doesn't exist, create default entities based on template type
        const defaultEntities = createDefaultEntitiesForTemplate(templateId);

        return {
          success: true,
          data: {
            info,
            entities: defaultEntities,
            suggestedName: `New ${info.name}`,
          },
        };
      }

      return {
        success: true,
        data: {
          info,
          entities,
          suggestedName: `New ${info.name}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load template',
      };
    }
  });
}

/**
 * Create default entities for a template when the file doesn't exist
 */
function createDefaultEntitiesForTemplate(templateId: string): Entity[] {
  const baseEntity = {
    parentId: null,
    childIds: [],
    visible: true,
    locked: false,
  };

  switch (templateId) {
    case 'empty':
      // Just a ground plane
      return [
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Ground',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 }, // Rotated flat
            scale: { x: 10, y: 10, z: 1 },
          },
        },
      ];

    case 'room':
      // Room with floor and walls
      return [
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Floor',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 },
            scale: { x: 6, y: 6, z: 1 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Back Wall',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: 0, y: 1.5, z: -3 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 6, y: 3, z: 1 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Left Wall',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: -3, y: 1.5, z: 0 },
            rotation: { x: 0, y: 0.7071068, z: 0, w: 0.7071068 },
            scale: { x: 6, y: 3, z: 1 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Right Wall',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: 3, y: 1.5, z: 0 },
            rotation: { x: 0, y: -0.7071068, z: 0, w: 0.7071068 },
            scale: { x: 6, y: 3, z: 1 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Table',
          type: EntityType.CubeMesh,
          transform: {
            position: { x: 0, y: 0.4, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1.5, y: 0.1, z: 0.8 },
          },
        },
      ];

    case 'park':
      // Outdoor park with ground and some objects
      return [
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Grass',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 },
            scale: { x: 20, y: 20, z: 1 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Path',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: 0, y: 0.01, z: 0 },
            rotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 },
            scale: { x: 2, y: 15, z: 1 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Tree Trunk',
          type: EntityType.CylinderMesh,
          transform: {
            position: { x: 4, y: 1, z: -3 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 0.3, y: 2, z: 0.3 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Tree Foliage',
          type: EntityType.SphereMesh,
          transform: {
            position: { x: 4, y: 3, z: -3 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 2, y: 2, z: 2 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Bench',
          type: EntityType.CubeMesh,
          transform: {
            position: { x: -3, y: 0.3, z: 2 },
            rotation: { x: 0, y: 0.3826834, z: 0, w: 0.9238795 },
            scale: { x: 1.5, y: 0.1, z: 0.4 },
          },
        },
      ];

    case 'gallery':
      // Gallery with pedestals and frames
      return [
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Floor',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: -0.7071068, y: 0, z: 0, w: 0.7071068 },
            scale: { x: 12, y: 8, z: 1 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Back Wall',
          type: EntityType.PlaneMesh,
          transform: {
            position: { x: 0, y: 2, z: -4 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 12, y: 4, z: 1 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Pedestal 1',
          type: EntityType.CubeMesh,
          transform: {
            position: { x: -3, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 0.8, y: 1, z: 0.8 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Pedestal 2',
          type: EntityType.CubeMesh,
          transform: {
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 0.8, y: 1, z: 0.8 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Pedestal 3',
          type: EntityType.CubeMesh,
          transform: {
            position: { x: 3, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 0.8, y: 1, z: 0.8 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Frame 1',
          type: EntityType.CubeMesh,
          transform: {
            position: { x: -3, y: 2, z: -3.95 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1.5, y: 1.2, z: 0.05 },
          },
        },
        {
          ...baseEntity,
          id: crypto.randomUUID(),
          name: 'Frame 2',
          type: EntityType.CubeMesh,
          transform: {
            position: { x: 3, y: 2, z: -3.95 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1.5, y: 1.2, z: 0.05 },
          },
        },
      ];

    default:
      return [];
  }
}

/**
 * Unregister template IPC handlers
 */
export function unregisterTemplateHandlers(): void {
  ipcMain.removeHandler(TemplateChannels.LIST);
  ipcMain.removeHandler(TemplateChannels.LOAD);
}
