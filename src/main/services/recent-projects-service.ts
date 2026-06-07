/**
 * Recent Projects Service
 *
 * Manages the list of recently opened projects.
 * Stores data in a JSON file in the user data directory.
 */

import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RecentProject } from '../../shared/types/ipc';

/** Maximum number of recent projects to store */
const MAX_RECENT_PROJECTS = 10;

/** Filename for recent projects storage */
const RECENT_PROJECTS_FILE = 'recent-projects.json';

/**
 * Get the path to the recent projects file
 */
function getRecentProjectsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, RECENT_PROJECTS_FILE);
}

/**
 * Load recent projects from disk
 */
export function loadRecentProjects(): RecentProject[] {
  const filePath = getRecentProjectsPath();

  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const projects = JSON.parse(data) as RecentProject[];

    // Validate the data structure
    if (!Array.isArray(projects)) {
      console.warn('[recent-projects] Invalid data structure, resetting');
      return [];
    }

    // Check existence for each project
    return projects.map((project) => ({
      ...project,
      exists: fs.existsSync(project.path),
    }));
  } catch (error) {
    console.error('[recent-projects] Failed to load:', error);
    return [];
  }
}

/**
 * Save recent projects to disk
 */
function saveRecentProjects(projects: RecentProject[]): void {
  const filePath = getRecentProjectsPath();

  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Remove exists property before saving (will be recomputed on load)
    const dataToSave = projects.map(({ exists, ...rest }) => rest);
    fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (error) {
    console.error('[recent-projects] Failed to save:', error);
  }
}

/**
 * Add a project to the recent list
 * If the project already exists in the list, it will be moved to the top
 */
export function addRecentProject(name: string, projectPath: string): RecentProject[] {
  const projects = loadRecentProjects();

  // Remove any existing entry with the same path
  const filtered = projects.filter((p) => p.path !== projectPath);

  // Create new entry at the front
  const newEntry: RecentProject = {
    name,
    path: projectPath,
    lastOpened: new Date().toISOString(),
    exists: true,
  };

  // Add to front and limit to max
  const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_PROJECTS);

  saveRecentProjects(updated);
  return updated;
}

/**
 * Remove a project from the recent list
 */
export function removeRecentProject(projectPath: string): RecentProject[] {
  const projects = loadRecentProjects();
  const updated = projects.filter((p) => p.path !== projectPath);
  saveRecentProjects(updated);
  return updated;
}

/**
 * Clear all recent projects
 */
export function clearRecentProjects(): void {
  saveRecentProjects([]);
}

/**
 * Get recent projects (with existence check)
 */
export function getRecentProjects(): RecentProject[] {
  return loadRecentProjects();
}
