/**
 * Application Menu Configuration
 *
 * Defines the main application menu for WorldKit.
 * Follows platform conventions for menu structure.
 */

import {
  Menu,
  MenuItemConstructorOptions,
  shell,
  app,
  BrowserWindow,
} from 'electron';
import { sendNewProjectEvent, sendSaveTrigger, sendOpenTrigger } from './ipc/projectHandlers';
import { sendAddPrimitiveEvent, sendImportModelEvent } from './ipc/sceneHandlers';
import { triggerExport } from './ipc/exportHandlers';
import {
  getRecentProjects,
  clearRecentProjects,
  removeRecentProject,
} from './services/recent-projects-service';
import { ProjectChannels, ViewChannels, PreviewChannels, EditChannels } from '../shared/ipc-channels';
import type { RecentProject } from '../shared/types/ipc';

/**
 * Send a request to open a specific project by path
 */
function sendOpenProjectPath(projectPath: string): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    // We'll use the TRIGGER_OPEN channel but add the path as an additional param
    // Actually, let's create a new approach - we'll directly use openPath from renderer
    // For now, we just trigger the open and let the user handle it
    win.webContents.send(ProjectChannels.TRIGGER_OPEN);
  }
}

/**
 * Build the recent projects submenu
 */
function buildRecentProjectsSubmenu(): MenuItemConstructorOptions[] {
  const recentProjects = getRecentProjects();

  if (recentProjects.length === 0) {
    return [
      {
        label: 'No Recent Projects',
        enabled: false,
      },
    ];
  }

  const items: MenuItemConstructorOptions[] = recentProjects.map(
    (project: RecentProject) => ({
      label: project.name,
      sublabel: project.path,
      enabled: project.exists !== false,
      click: () => {
        // Open the project by sending a message to renderer
        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          win.webContents.send(ProjectChannels.OPEN_RECENT, project.path);
        }
      },
    })
  );

  // Add separator and clear option
  items.push({ type: 'separator' });
  items.push({
    label: 'Clear Recent Projects',
    click: () => {
      clearRecentProjects();
      // Rebuild menu
      const menu = createApplicationMenu();
      Menu.setApplicationMenu(menu);
      // Notify renderer
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send(ProjectChannels.RECENT_UPDATED, []);
      }
    },
  });

  return items;
}

/**
 * Creates the application menu
 * @returns The configured Menu instance
 */
export function createApplicationMenu(): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New World',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Send event to renderer to create new blank world
            sendNewProjectEvent();
          },
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            sendOpenTrigger();
          },
        },
        {
          label: 'Open Recent',
          submenu: buildRecentProjectsSubmenu(),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            sendSaveTrigger();
          },
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            // Save As will be handled via renderer dialog
            sendSaveTrigger();
          },
        },
        { type: 'separator' },
        {
          label: 'Import Model...',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            sendImportModelEvent();
          },
        },
        {
          label: 'Export VEML...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            triggerExport();
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(EditChannels.UNDO);
            }
          },
        },
        {
          label: 'Redo',
          accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(EditChannels.REDO);
            }
          },
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        {
          label: 'Delete',
          accelerator: 'Delete',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(EditChannels.DELETE);
            }
          },
        },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Add',
          submenu: [
            {
              label: 'Cube',
              accelerator: 'Shift+1',
              click: () => {
                sendAddPrimitiveEvent('cube');
              },
            },
            {
              label: 'Sphere',
              accelerator: 'Shift+2',
              click: () => {
                sendAddPrimitiveEvent('sphere');
              },
            },
            {
              label: 'Plane',
              accelerator: 'Shift+3',
              click: () => {
                sendAddPrimitiveEvent('plane');
              },
            },
            {
              label: 'Cylinder',
              accelerator: 'Shift+4',
              click: () => {
                sendAddPrimitiveEvent('cylinder');
              },
            },
            {
              label: 'Cone',
              accelerator: 'Shift+5',
              click: () => {
                sendAddPrimitiveEvent('cone');
              },
            },
            {
              label: 'Torus',
              accelerator: 'Shift+6',
              click: () => {
                sendAddPrimitiveEvent('torus');
              },
            },
            { type: 'separator' },
            {
              label: 'Capsule',
              click: () => {
                sendAddPrimitiveEvent('capsule');
              },
            },
            {
              label: 'Pyramid',
              click: () => {
                sendAddPrimitiveEvent('pyramid');
              },
            },
            {
              label: 'Tetrahedron',
              click: () => {
                sendAddPrimitiveEvent('tetrahedron');
              },
            },
            {
              label: 'Prism',
              click: () => {
                sendAddPrimitiveEvent('prism');
              },
            },
            {
              label: 'Arch',
              click: () => {
                sendAddPrimitiveEvent('arch');
              },
            },
          ],
        },
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Preview in WebVerse',
          accelerator: 'F5',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(PreviewChannels.TRIGGER);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle Scene Tree',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(ViewChannels.TOGGLE_SCENE_TREE);
            }
          },
        },
        {
          label: 'Toggle Properties',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(ViewChannels.TOGGLE_PROPERTIES);
            }
          },
        },
        {
          label: 'Toggle Asset Library',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(ViewChannels.TOGGLE_ASSET_LIBRARY);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Show VEML Code',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(ViewChannels.TOGGLE_VEML_CODE);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Minimize to Tray',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.hide();
            }
          },
        },
        // Only show developer tools in development mode
        ...(app.isPackaged
          ? []
          : [
              { type: 'separator' as const },
              { role: 'reload' as const },
              { role: 'forceReload' as const },
              { role: 'toggleDevTools' as const },
            ]),
      ],
    },

    // Help Menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://worldkit.dev/docs');
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/worldkit/worldkit/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'About World Builder',
          click: async () => {
            const { dialog } = await import('electron');
            const version = app.getVersion();
            dialog.showMessageBox({
              type: 'info',
              title: 'About World Builder',
              message: 'WorldKit World Builder',
              detail: `Version ${version}\n\nA visual world building tool for creating immersive 3D experiences compatible with WebVerse.`,
            });
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

/**
 * Refresh the application menu
 * Call this when recent projects list changes
 */
export function refreshApplicationMenu(): void {
  const menu = createApplicationMenu();
  Menu.setApplicationMenu(menu);
}
