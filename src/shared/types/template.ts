/**
 * Template Types
 *
 * Types for world templates used in the New Project dialog.
 */

import type { Entity } from '../../renderer/types/entity';

/**
 * Template metadata for display in the gallery
 */
export interface TemplateInfo {
  /** Unique template ID */
  id: string;

  /** Display name */
  name: string;

  /** Description of the template */
  description: string;

  /** Path to thumbnail image (relative to resources) */
  thumbnail: string;

  /** Template file path (relative to resources/templates) */
  templatePath: string;
}

/**
 * Loaded template data with entities
 */
export interface TemplateData {
  /** Template info */
  info: TemplateInfo;

  /** Entities to populate the scene */
  entities: Entity[];

  /** Project name suggestion */
  suggestedName: string;
}

/**
 * Result of listing available templates
 */
export interface ListTemplatesResult {
  success: boolean;
  templates?: TemplateInfo[];
  error?: string;
}

/**
 * Result of loading a template
 */
export interface LoadTemplateResult {
  success: boolean;
  data?: TemplateData;
  error?: string;
}
