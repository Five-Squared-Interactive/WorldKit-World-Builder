/**
 * Project Handlers
 *
 * IPC handlers for project management operations.
 * Handles creating new projects, saving, and prompting for unsaved changes.
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectChannels } from '../../shared/ipc-channels';
import {
  getRecentProjects,
  addRecentProject,
  removeRecentProject,
  clearRecentProjects,
} from '../services/recent-projects-service';
import {
  performAutoSave,
  checkAutoSaveRecovery,
  recoverFromAutoSave,
  discardAutoSave,
  clearAutoSaveAfterSave,
} from '../services/auto-save-service';
import { refreshApplicationMenu } from '../menu';

import type {
  UnsavedChangesResult,
  SaveProjectResult,
  SaveProjectRequest,
  OpenProjectResult,
  GetRecentProjectsResult,
  RecentProject,
  AutoSaveRequest,
  AutoSaveResult,
  RecoveryCheckResult,
  RecoveryResult,
} from '../../shared/types/ipc';

// Re-export for convenience
export type {
  UnsavedChangesResult,
  SaveProjectResult,
  SaveProjectRequest,
  OpenProjectResult,
  GetRecentProjectsResult,
  RecentProject,
  AutoSaveRequest,
  AutoSaveResult,
  RecoveryCheckResult,
  RecoveryResult,
} from '../../shared/types/ipc';

/**
 * Broadcast recent projects list update to all windows and refresh menu
 */
function broadcastRecentUpdate(projects: RecentProject[]): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(ProjectChannels.RECENT_UPDATED, projects);
  }
  // Refresh menu to update "Open Recent" submenu
  refreshApplicationMenu();
}

/**
 * Send new project event to all renderer windows
 * Called from menu when user clicks "New World"
 */
export function sendNewProjectEvent(): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(ProjectChannels.NEW);
  }
}

/**
 * Send save trigger to renderer
 * Called from menu when user clicks File > Save or presses Ctrl+S
 */
export function sendSaveTrigger(): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(ProjectChannels.TRIGGER_SAVE);
  }
}

/**
 * Send open trigger to renderer
 * Called from menu when user clicks File > Open or presses Ctrl+O
 */
export function sendOpenTrigger(): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(ProjectChannels.TRIGGER_OPEN);
  }
}

/**
 * Show native dialog asking user about unsaved changes
 * @returns User's choice: 'save', 'discard', or 'cancel'
 */
export async function showUnsavedChangesDialog(): Promise<UnsavedChangesResult> {
  // Get focused window, fallback to first available window if none focused
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const targetWindow = focusedWindow ?? BrowserWindow.getAllWindows()[0] ?? null;

  const dialogOptions = {
    type: 'question' as const,
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved Changes',
    message: 'Do you want to save changes to your world?',
    detail: 'Your changes will be lost if you don\'t save them.',
  };

  // Show dialog attached to window if available, otherwise show standalone
  const result = targetWindow
    ? await dialog.showMessageBox(targetWindow, dialogOptions)
    : await dialog.showMessageBox(dialogOptions);

  switch (result.response) {
    case 0:
      return 'save';
    case 1:
      return 'discard';
    case 2:
    default:
      return 'cancel';
  }
}

/**
 * Show save dialog to select project location
 * @returns Selected folder path or null if cancelled
 */
async function showSaveDialog(defaultName: string): Promise<string | null> {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const targetWindow = focusedWindow ?? BrowserWindow.getAllWindows()[0] ?? null;

  const dialogOptions = {
    title: 'Save Project',
    defaultPath: `${defaultName}.wk`,
    filters: [{ name: 'WorldKit Project', extensions: ['wk'] }],
  };

  const result = targetWindow
    ? await dialog.showSaveDialog(targetWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  if (result.canceled || !result.filePath) {
    return null;
  }

  // Ensure .wk extension
  let projectPath = result.filePath;
  if (!projectPath.endsWith('.wk')) {
    projectPath += '.wk';
  }

  return projectPath;
}

/**
 * Show open dialog to select project folder
 * @returns Selected folder path or null if cancelled
 */
async function showOpenDialog(): Promise<string | null> {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const targetWindow = focusedWindow ?? BrowserWindow.getAllWindows()[0] ?? null;

  const dialogOptions = {
    title: 'Open Project',
    properties: ['openDirectory' as const],
    filters: [{ name: 'WorldKit Project', extensions: ['wk'] }],
  };

  const result = targetWindow
    ? await dialog.showOpenDialog(targetWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const projectPath = result.filePaths[0];

  // Validate it's a .wk folder
  if (!projectPath.endsWith('.wk')) {
    // Check if the selected folder contains a world.veml
    const vemlPath = path.join(projectPath, 'world.veml');
    if (!fs.existsSync(vemlPath)) {
      return null;
    }
  }

  return projectPath;
}

/**
 * Open project from disk
 */
async function openProjectFromDisk(projectPath: string): Promise<OpenProjectResult> {
  try {
    // Validate project folder exists
    if (!fs.existsSync(projectPath)) {
      return {
        success: false,
        error: 'Project folder not found',
      };
    }

    // Read world.veml
    const vemlPath = path.join(projectPath, 'world.veml');
    if (!fs.existsSync(vemlPath)) {
      return {
        success: false,
        error: 'Invalid project: missing world.veml file',
      };
    }

    const vemlContent = fs.readFileSync(vemlPath, 'utf-8');

    // Extract project name from folder
    const pathParts = projectPath.replace(/\\/g, '/').split('/');
    const folderName = pathParts[pathParts.length - 1].replace('.wk', '');

    return {
      success: true,
      path: projectPath,
      name: folderName,
      vemlContent,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open project',
    };
  }
}

/**
 * Save project to disk
 */
async function saveProjectToDisk(request: SaveProjectRequest): Promise<SaveProjectResult> {
  try {
    const projectPath = request.path;

    // Create .wk folder if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Create assets folder
    const assetsPath = path.join(projectPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }

    // Write world.veml file
    const vemlPath = path.join(projectPath, 'world.veml');
    fs.writeFileSync(vemlPath, request.vemlContent, 'utf-8');

    // Copy model assets if any
    if (request.modelFiles && request.modelFiles.length > 0) {
      for (const modelPath of request.modelFiles) {
        if (fs.existsSync(modelPath)) {
          const fileName = path.basename(modelPath);
          const destPath = path.join(assetsPath, fileName);
          fs.copyFileSync(modelPath, destPath);
        }
      }
    }

    return {
      success: true,
      path: projectPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save project',
    };
  }
}

/**
 * Register all project-related IPC handlers
 */
export function registerProjectHandlers(): void {
  // Handle new project request from renderer (invoke pattern)
  ipcMain.handle(ProjectChannels.NEW, async () => {
    // The actual new project logic runs in renderer
    // This handler is for any main-process coordination needed
    return true;
  });

  // Handle unsaved changes dialog request
  ipcMain.handle(ProjectChannels.SHOW_UNSAVED_DIALOG, async () => {
    return showUnsavedChangesDialog();
  });

  // Handle save project (with existing path)
  ipcMain.handle(
    ProjectChannels.SAVE,
    async (_event, request: SaveProjectRequest): Promise<SaveProjectResult> => {
      // If no path provided, need to show save dialog
      if (!request.path) {
        const selectedPath = await showSaveDialog(request.projectName || 'Untitled World');
        if (!selectedPath) {
          return { success: false, cancelled: true };
        }
        request.path = selectedPath;
      }

      const result = await saveProjectToDisk(request);

      // Add to recent projects on successful save
      if (result.success && result.path) {
        const projectName = request.projectName || path.basename(result.path).replace('.wk', '');
        const updated = addRecentProject(projectName, result.path);
        broadcastRecentUpdate(updated);
        // Clear auto-save after successful manual save
        clearAutoSaveAfterSave();
      }

      return result;
    }
  );

  // Handle save as (always shows dialog)
  ipcMain.handle(
    ProjectChannels.SAVE_AS,
    async (_event, request: SaveProjectRequest): Promise<SaveProjectResult> => {
      const selectedPath = await showSaveDialog(request.projectName || 'Untitled World');
      if (!selectedPath) {
        return { success: false, cancelled: true };
      }
      request.path = selectedPath;

      const result = await saveProjectToDisk(request);

      // Add to recent projects on successful save
      if (result.success && result.path) {
        const projectName = request.projectName || path.basename(result.path).replace('.wk', '');
        const updated = addRecentProject(projectName, result.path);
        broadcastRecentUpdate(updated);
        // Clear auto-save after successful manual save
        clearAutoSaveAfterSave();
      }

      return result;
    }
  );

  // Handle open project (shows dialog)
  ipcMain.handle(ProjectChannels.OPEN, async (): Promise<OpenProjectResult> => {
    const selectedPath = await showOpenDialog();
    if (!selectedPath) {
      return { success: false, cancelled: true };
    }

    const result = await openProjectFromDisk(selectedPath);

    // Add to recent projects on successful open
    if (result.success && result.path && result.name) {
      const updated = addRecentProject(result.name, result.path);
      broadcastRecentUpdate(updated);
    }

    return result;
  });

  // Handle open project by path (no dialog)
  ipcMain.handle(
    ProjectChannels.OPEN_PATH,
    async (_event, projectPath: string): Promise<OpenProjectResult> => {
      const result = await openProjectFromDisk(projectPath);

      // Add to recent projects on successful open
      if (result.success && result.path && result.name) {
        const updated = addRecentProject(result.name, result.path);
        broadcastRecentUpdate(updated);
      }

      return result;
    }
  );

  // Handle get recent projects
  ipcMain.handle(ProjectChannels.GET_RECENT, async (): Promise<GetRecentProjectsResult> => {
    try {
      const projects = getRecentProjects();
      return { success: true, projects };
    } catch (error) {
      return {
        success: false,
        projects: [],
        error: error instanceof Error ? error.message : 'Failed to get recent projects',
      };
    }
  });

  // Handle add recent project
  ipcMain.handle(
    ProjectChannels.ADD_RECENT,
    async (_event, project: { name: string; path: string }): Promise<void> => {
      const updated = addRecentProject(project.name, project.path);
      broadcastRecentUpdate(updated);
    }
  );

  // Handle remove recent project
  ipcMain.handle(ProjectChannels.REMOVE_RECENT, async (_event, projectPath: string): Promise<void> => {
    const updated = removeRecentProject(projectPath);
    broadcastRecentUpdate(updated);
  });

  // Handle clear recent projects
  ipcMain.handle(ProjectChannels.CLEAR_RECENT, async (): Promise<void> => {
    clearRecentProjects();
    broadcastRecentUpdate([]);
  });

  // Handle auto-save
  ipcMain.handle(
    ProjectChannels.AUTOSAVE,
    async (_event, request: AutoSaveRequest): Promise<AutoSaveResult> => {
      return performAutoSave(request);
    }
  );

  // Handle check for recovery
  ipcMain.handle(ProjectChannels.CHECK_RECOVERY, async (): Promise<RecoveryCheckResult> => {
    return checkAutoSaveRecovery();
  });

  // Handle recovery
  ipcMain.handle(ProjectChannels.RECOVER, async (): Promise<RecoveryResult> => {
    return recoverFromAutoSave();
  });

  // Handle discard recovery
  ipcMain.handle(ProjectChannels.DISCARD_RECOVERY, async (): Promise<void> => {
    discardAutoSave();
  });
}

/**
 * Unregister all project-related IPC handlers
 * Useful for cleanup during testing
 */
export function unregisterProjectHandlers(): void {
  ipcMain.removeHandler(ProjectChannels.NEW);
  ipcMain.removeHandler(ProjectChannels.SHOW_UNSAVED_DIALOG);
  ipcMain.removeHandler(ProjectChannels.SAVE);
  ipcMain.removeHandler(ProjectChannels.SAVE_AS);
  ipcMain.removeHandler(ProjectChannels.OPEN);
  ipcMain.removeHandler(ProjectChannels.OPEN_PATH);
  ipcMain.removeHandler(ProjectChannels.GET_RECENT);
  ipcMain.removeHandler(ProjectChannels.ADD_RECENT);
  ipcMain.removeHandler(ProjectChannels.REMOVE_RECENT);
  ipcMain.removeHandler(ProjectChannels.CLEAR_RECENT);
  ipcMain.removeHandler(ProjectChannels.AUTOSAVE);
  ipcMain.removeHandler(ProjectChannels.CHECK_RECOVERY);
  ipcMain.removeHandler(ProjectChannels.RECOVER);
  ipcMain.removeHandler(ProjectChannels.DISCARD_RECOVERY);
}
