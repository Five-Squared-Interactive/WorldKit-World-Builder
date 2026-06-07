/**
 * Preload Script
 *
 * Securely exposes the WorldKit API to the renderer process
 * using contextBridge. This is the ONLY bridge between
 * renderer and main processes.
 *
 * Security: contextIsolation is enabled, so the renderer
 * cannot access Node.js APIs directly.
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  SystemChannels,
  WindowChannels,
  FileOpenChannels,
  FileChannels,
  DeepLinkChannels,
  UpdateChannels,
  NetworkChannels,
  ProjectChannels,
  SceneChannels,
  TemplateChannels,
  PreferencesChannels,
  WebVerseChannels,
  ExportChannels,
  EditChannels,
  ViewChannels,
  PreviewChannels,
} from '../shared/ipc-channels';
import type {
  WorldKitAPI,
  AppPathName,
  UpdateStatus,
  NetworkStatus,
  UnsavedChangesResult,
  PrimitiveType,
  ImportModelResult,
  ReadFileBase64Result,
  ListTemplatesResult,
  LoadTemplateResult,
  SaveProjectRequest,
  SaveProjectResult,
  OpenProjectResult,
  GetRecentProjectsResult,
  RecentProject,
  AutoSaveRequest,
  AutoSaveResult,
  RecoveryCheckResult,
  RecoveryResult,
  Preferences,
  WebVerseDetectionResult,
  WebVerseBrowseResult,
  ExportVemlRequest,
  ExportVemlResult,
  PreviewLaunchRequest,
  PreviewLaunchResult,
  PreviewStatus,
} from '../shared/types/ipc';

/**
 * Valid app path names for validation
 */
const VALID_APP_PATHS: readonly AppPathName[] = [
  'userData',
  'documents',
  'temp',
  'home',
  'appData',
] as const;

/**
 * WorldKit API implementation
 * Each method wraps an ipcRenderer.invoke call to the main process
 */
const worldkitAPI: WorldKitAPI = {
  /**
   * API contract version (not app version - use system.getAppVersion() for that)
   * This version indicates the shape/compatibility of the exposed API
   */
  version: '1.0.0',

  system: {
    /**
     * Get the application version
     */
    getAppVersion: () => ipcRenderer.invoke(SystemChannels.GET_APP_VERSION),

    /**
     * Get the current platform
     */
    getPlatform: () => ipcRenderer.invoke(SystemChannels.GET_PLATFORM),

    /**
     * Get a special app directory path
     * @throws Error if name is not a valid AppPathName
     */
    getAppPath: (name: AppPathName) => {
      // Validate at the preload boundary (defense in depth)
      if (!VALID_APP_PATHS.includes(name)) {
        return Promise.reject(new Error(`Invalid app path name: ${name}`));
      }
      return ipcRenderer.invoke(SystemChannels.GET_APP_PATH, name);
    },
  },

  file: {
    /**
     * Show dialog to import a 3D model (GLB/GLTF)
     */
    importModel: (): Promise<ImportModelResult> =>
      ipcRenderer.invoke(FileChannels.IMPORT_MODEL),

    /**
     * Read a file and return it as base64 data
     * @param filePath - Absolute path to the file
     */
    readFileBase64: (filePath: string): Promise<ReadFileBase64Result> => {
      if (typeof filePath !== 'string' || filePath.trim().length === 0) {
        return Promise.reject(new Error('File path must be a non-empty string'));
      }
      return ipcRenderer.invoke(FileChannels.READ_FILE_BASE64, filePath);
    },
  },

  window: {
    /**
     * Set the window title
     * @param title - The new window title (must be non-empty string)
     */
    setTitle: (title: string) => {
      if (typeof title !== 'string') {
        return Promise.reject(new Error('Title must be a string'));
      }
      if (title.trim().length === 0) {
        return Promise.reject(new Error('Title cannot be empty'));
      }
      return ipcRenderer.invoke(WindowChannels.SET_TITLE, title);
    },
  },

  fileOpen: {
    /**
     * Register a callback for when a .worldkit project file is opened
     * @param callback - Function to call with the file path
     * @returns Cleanup function to remove the listener
     */
    onProjectOpen: (callback: (filePath: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, filePath: string) => {
        callback(filePath);
      };
      ipcRenderer.on(FileOpenChannels.PROJECT, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(FileOpenChannels.PROJECT, listener);
      };
    },

    /**
     * Register a callback for when a .veml file is opened
     * @param callback - Function to call with the file path
     * @returns Cleanup function to remove the listener
     */
    onVemlOpen: (callback: (filePath: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, filePath: string) => {
        callback(filePath);
      };
      ipcRenderer.on(FileOpenChannels.VEML, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(FileOpenChannels.VEML, listener);
      };
    },
  },

  deepLink: {
    /**
     * Register a callback for when a file is opened via deep link
     * @param callback - Function to call with the file path
     * @returns Cleanup function to remove the listener
     */
    onOpenFile: (callback: (filePath: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, filePath: string) => {
        callback(filePath);
      };
      ipcRenderer.on(DeepLinkChannels.OPEN_FILE, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(DeepLinkChannels.OPEN_FILE, listener);
      };
    },

    /**
     * Register a callback for when a template is opened via deep link
     * @param callback - Function to call with the template name
     * @returns Cleanup function to remove the listener
     */
    onOpenTemplate: (callback: (templateName: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, templateName: string) => {
        callback(templateName);
      };
      ipcRenderer.on(DeepLinkChannels.OPEN_TEMPLATE, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(DeepLinkChannels.OPEN_TEMPLATE, listener);
      };
    },
  },

  update: {
    /**
     * Check for available updates
     * @returns Current update status after check
     */
    checkForUpdates: () => ipcRenderer.invoke(UpdateChannels.CHECK),

    /**
     * Get the current update status
     * @returns Current update status
     */
    getStatus: () => ipcRenderer.invoke(UpdateChannels.GET_STATUS),

    /**
     * Quit the app and install the downloaded update
     */
    quitAndInstall: () => ipcRenderer.invoke(UpdateChannels.QUIT_AND_INSTALL),

    /**
     * Register a callback for update status changes
     * @param callback - Function to call with the update status
     * @returns Cleanup function to remove the listener
     */
    onStatusChange: (callback: (status: UpdateStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => {
        callback(status);
      };
      ipcRenderer.on(UpdateChannels.STATUS, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(UpdateChannels.STATUS, listener);
      };
    },
  },

  network: {
    /**
     * Get the current network status
     * @returns Current network status
     */
    getStatus: () => ipcRenderer.invoke(NetworkChannels.GET_STATUS),

    /**
     * Register a callback for network status changes
     * @param callback - Function to call with the network status
     * @returns Cleanup function to remove the listener
     */
    onStatusChange: (callback: (status: NetworkStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: NetworkStatus) => {
        callback(status);
      };
      ipcRenderer.on(NetworkChannels.STATUS, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(NetworkChannels.STATUS, listener);
      };
    },
  },

  project: {
    /**
     * Register a callback for when a new project should be created
     * Called when user selects File > New World or presses Ctrl+N
     * @param callback - Function to call when new project event is received
     * @returns Cleanup function to remove the listener
     */
    onNewProject: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(ProjectChannels.NEW, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(ProjectChannels.NEW, listener);
      };
    },

    /**
     * Register a callback for when save is triggered from menu
     * Called when user selects File > Save or presses Ctrl+S
     * @param callback - Function to call when save event is received
     * @returns Cleanup function to remove the listener
     */
    onSaveTrigger: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(ProjectChannels.TRIGGER_SAVE, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(ProjectChannels.TRIGGER_SAVE, listener);
      };
    },

    /**
     * Register a callback for when open is triggered from menu
     * Called when user selects File > Open or presses Ctrl+O
     * @param callback - Function to call when open event is received
     * @returns Cleanup function to remove the listener
     */
    onOpenTrigger: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(ProjectChannels.TRIGGER_OPEN, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(ProjectChannels.TRIGGER_OPEN, listener);
      };
    },

    /**
     * Show the unsaved changes dialog
     * @returns User's choice: 'save', 'discard', or 'cancel'
     */
    showUnsavedChangesDialog: (): Promise<UnsavedChangesResult> =>
      ipcRenderer.invoke(ProjectChannels.SHOW_UNSAVED_DIALOG),

    /**
     * Save project to disk
     * @param request - Save request with VEML content and optional path
     * @returns Result with success status and path
     */
    save: (request: SaveProjectRequest): Promise<SaveProjectResult> =>
      ipcRenderer.invoke(ProjectChannels.SAVE, request),

    /**
     * Save project to new location (always shows save dialog)
     * @param request - Save request with VEML content
     * @returns Result with success status and path
     */
    saveAs: (request: SaveProjectRequest): Promise<SaveProjectResult> =>
      ipcRenderer.invoke(ProjectChannels.SAVE_AS, request),

    /**
     * Open project from disk (shows open dialog)
     * @returns Result with VEML content and project path
     */
    open: (): Promise<OpenProjectResult> => ipcRenderer.invoke(ProjectChannels.OPEN),

    /**
     * Open a specific project by path (skips file dialog)
     * @param path - Path to the project to open
     * @returns Result with VEML content and project path
     */
    openPath: (projectPath: string): Promise<OpenProjectResult> => {
      if (typeof projectPath !== 'string' || projectPath.trim().length === 0) {
        return Promise.reject(new Error('Project path must be a non-empty string'));
      }
      return ipcRenderer.invoke(ProjectChannels.OPEN_PATH, projectPath);
    },

    /**
     * Get list of recent projects
     * @returns List of recent projects with existence check
     */
    getRecent: (): Promise<GetRecentProjectsResult> =>
      ipcRenderer.invoke(ProjectChannels.GET_RECENT),

    /**
     * Add a project to the recent list
     * @param project - Project to add
     */
    addRecent: (project: { name: string; path: string }): Promise<void> => {
      if (!project || typeof project.name !== 'string' || typeof project.path !== 'string') {
        return Promise.reject(new Error('Project must have name and path'));
      }
      return ipcRenderer.invoke(ProjectChannels.ADD_RECENT, project);
    },

    /**
     * Remove a project from the recent list
     * @param path - Path of project to remove
     */
    removeRecent: (projectPath: string): Promise<void> => {
      if (typeof projectPath !== 'string' || projectPath.trim().length === 0) {
        return Promise.reject(new Error('Project path must be a non-empty string'));
      }
      return ipcRenderer.invoke(ProjectChannels.REMOVE_RECENT, projectPath);
    },

    /**
     * Clear all recent projects
     */
    clearRecent: (): Promise<void> => ipcRenderer.invoke(ProjectChannels.CLEAR_RECENT),

    /**
     * Register a callback for when the recent projects list updates
     * @param callback - Function to call with updated projects
     * @returns Cleanup function to remove the listener
     */
    onRecentUpdated: (callback: (projects: RecentProject[]) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, projects: RecentProject[]) => {
        callback(projects);
      };
      ipcRenderer.on(ProjectChannels.RECENT_UPDATED, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(ProjectChannels.RECENT_UPDATED, listener);
      };
    },

    /**
     * Register a callback for when a recent project should be opened from menu
     * @param callback - Function to call with the project path
     * @returns Cleanup function to remove the listener
     */
    onOpenRecent: (callback: (path: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, projectPath: string) => {
        callback(projectPath);
      };
      ipcRenderer.on(ProjectChannels.OPEN_RECENT, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(ProjectChannels.OPEN_RECENT, listener);
      };
    },

    /**
     * Auto-save the current project
     * @param request - Auto-save request with VEML content
     * @returns Result with success status
     */
    autoSave: (request: AutoSaveRequest): Promise<AutoSaveResult> =>
      ipcRenderer.invoke(ProjectChannels.AUTOSAVE, request),

    /**
     * Check if there's an auto-save to recover from
     * @returns Recovery check result
     */
    checkRecovery: (): Promise<RecoveryCheckResult> =>
      ipcRenderer.invoke(ProjectChannels.CHECK_RECOVERY),

    /**
     * Recover from auto-save
     * @returns Recovery result with VEML content
     */
    recover: (): Promise<RecoveryResult> => ipcRenderer.invoke(ProjectChannels.RECOVER),

    /**
     * Discard auto-save recovery data
     */
    discardRecovery: (): Promise<void> => ipcRenderer.invoke(ProjectChannels.DISCARD_RECOVERY),
  },

  scene: {
    /**
     * Register a callback for when a primitive should be added to the scene
     * Called when user selects Edit > Add > Primitive or uses keyboard shortcut
     * @param callback - Function to call with the primitive type
     * @returns Cleanup function to remove the listener
     */
    onAddPrimitive: (callback: (type: PrimitiveType) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, type: PrimitiveType) => {
        callback(type);
      };
      ipcRenderer.on(SceneChannels.ADD_PRIMITIVE, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(SceneChannels.ADD_PRIMITIVE, listener);
      };
    },

    /**
     * Register a callback for when a 3D model should be imported
     * Called when user selects File > Import Model
     * @param callback - Function to call with the import result
     * @returns Cleanup function to remove the listener
     */
    onImportModel: (callback: (result: ImportModelResult) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, result: ImportModelResult) => {
        callback(result);
      };
      ipcRenderer.on(SceneChannels.IMPORT_MODEL, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(SceneChannels.IMPORT_MODEL, listener);
      };
    },
  },

  template: {
    /**
     * Get list of available templates
     * @returns List of template info
     */
    listTemplates: (): Promise<ListTemplatesResult> =>
      ipcRenderer.invoke(TemplateChannels.LIST),

    /**
     * Load a template by ID
     * @param templateId - The template ID to load
     * @returns Template data with entities
     */
    loadTemplate: (templateId: string): Promise<LoadTemplateResult> => {
      if (typeof templateId !== 'string' || templateId.trim().length === 0) {
        return Promise.reject(new Error('Template ID must be a non-empty string'));
      }
      return ipcRenderer.invoke(TemplateChannels.LOAD, templateId);
    },
  },

  preferences: {
    /**
     * Get all preferences
     * @returns Current preferences
     */
    getAll: (): Promise<Preferences> => ipcRenderer.invoke(PreferencesChannels.GET),

    /**
     * Set a preference value
     * @param key - Preference key
     * @param value - New value
     */
    set: <K extends keyof Preferences>(key: K, value: Preferences[K]): Promise<void> =>
      ipcRenderer.invoke(PreferencesChannels.SET, key, value),
  },

  webverse: {
    /**
     * Detect WebVerse installation
     * @returns Detection result with installation status
     */
    detect: (): Promise<WebVerseDetectionResult> => ipcRenderer.invoke(WebVerseChannels.DETECT),

    /**
     * Get cached WebVerse detection status
     * @returns Last detection result
     */
    getStatus: (): Promise<WebVerseDetectionResult> =>
      ipcRenderer.invoke(WebVerseChannels.GET_STATUS),

    /**
     * Open file dialog to browse for WebVerse executable
     * @returns Browse result with selected path
     */
    browse: (): Promise<WebVerseBrowseResult> => ipcRenderer.invoke(WebVerseChannels.BROWSE),

    /**
     * Set custom WebVerse path
     * @param path - Path to the WebVerse executable
     * @returns Updated detection result
     */
    setPath: (path: string): Promise<WebVerseDetectionResult> => {
      if (typeof path !== 'string' || path.trim().length === 0) {
        return Promise.reject(new Error('Path must be a non-empty string'));
      }
      return ipcRenderer.invoke(WebVerseChannels.SET_PATH, path);
    },
  },

  export: {
    /**
     * Export VEML to file (shows save dialog)
     * @param request - Export request with VEML content
     * @returns Export result with file path
     */
    exportVeml: (request: ExportVemlRequest): Promise<ExportVemlResult> => {
      if (!request || typeof request.vemlContent !== 'string') {
        return Promise.reject(new Error('VEML content is required'));
      }
      return ipcRenderer.invoke(ExportChannels.VEML, request);
    },

    /**
     * Register a callback for when export is triggered from menu
     * @param callback - Function to call when export is triggered
     * @returns Cleanup function to remove the listener
     */
    onExportTrigger: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(ExportChannels.TRIGGER_EXPORT, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(ExportChannels.TRIGGER_EXPORT, listener);
      };
    },
  },

  edit: {
    /**
     * Register a callback for when undo is triggered from menu (Ctrl+Z)
     * @param callback - Function to call when undo is triggered
     * @returns Cleanup function to remove the listener
     */
    onUndo: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(EditChannels.UNDO, listener);
      return () => {
        ipcRenderer.removeListener(EditChannels.UNDO, listener);
      };
    },

    /**
     * Register a callback for when redo is triggered from menu (Ctrl+Y / Ctrl+Shift+Z)
     * @param callback - Function to call when redo is triggered
     * @returns Cleanup function to remove the listener
     */
    onRedo: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(EditChannels.REDO, listener);
      return () => {
        ipcRenderer.removeListener(EditChannels.REDO, listener);
      };
    },

    /**
     * Register a callback for when delete is triggered from menu
     * @param callback - Function to call when delete is triggered
     * @returns Cleanup function to remove the listener
     */
    onDelete: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(EditChannels.DELETE, listener);
      return () => {
        ipcRenderer.removeListener(EditChannels.DELETE, listener);
      };
    },
  },

  view: {
    /**
     * Register a callback for when VEML code panel toggle is triggered from menu
     * @param callback - Function to call when toggle is triggered
     * @returns Cleanup function to remove the listener
     */
    onToggleVemlCode: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(ViewChannels.TOGGLE_VEML_CODE, listener);
      return () => {
        ipcRenderer.removeListener(ViewChannels.TOGGLE_VEML_CODE, listener);
      };
    },

    /**
     * Register a callback for when Scene Tree panel toggle is triggered from menu
     * @param callback - Function to call when toggle is triggered
     * @returns Cleanup function to remove the listener
     */
    onToggleSceneTree: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(ViewChannels.TOGGLE_SCENE_TREE, listener);
      return () => {
        ipcRenderer.removeListener(ViewChannels.TOGGLE_SCENE_TREE, listener);
      };
    },

    /**
     * Register a callback for when Properties panel toggle is triggered from menu
     * @param callback - Function to call when toggle is triggered
     * @returns Cleanup function to remove the listener
     */
    onToggleProperties: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(ViewChannels.TOGGLE_PROPERTIES, listener);
      return () => {
        ipcRenderer.removeListener(ViewChannels.TOGGLE_PROPERTIES, listener);
      };
    },

    /**
     * Register a callback for when Asset Library panel toggle is triggered from menu
     * @param callback - Function to call when toggle is triggered
     * @returns Cleanup function to remove the listener
     */
    onToggleAssetLibrary: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(ViewChannels.TOGGLE_ASSET_LIBRARY, listener);
      return () => {
        ipcRenderer.removeListener(ViewChannels.TOGGLE_ASSET_LIBRARY, listener);
      };
    },
  },

  preview: {
    /**
     * Launch preview in WebVerse
     * @param request - Preview launch request with VEML content
     * @returns Launch result
     */
    launch: (request: PreviewLaunchRequest): Promise<PreviewLaunchResult> => {
      if (!request || typeof request.vemlContent !== 'string') {
        return Promise.reject(new Error('VEML content is required'));
      }
      return ipcRenderer.invoke(PreviewChannels.LAUNCH, request);
    },

    /**
     * Register a callback for preview status changes
     * @param callback - Function to call with the preview status
     * @returns Cleanup function to remove the listener
     */
    onStatusChange: (callback: (status: PreviewStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: PreviewStatus) => {
        callback(status);
      };
      ipcRenderer.on(PreviewChannels.STATUS, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(PreviewChannels.STATUS, listener);
      };
    },

    /**
     * Register a callback for when preview is triggered from menu (F5)
     * @param callback - Function to call when preview is triggered
     * @returns Cleanup function to remove the listener
     */
    onTrigger: (callback: () => void) => {
      const listener = () => {
        callback();
      };
      ipcRenderer.on(PreviewChannels.TRIGGER, listener);
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(PreviewChannels.TRIGGER, listener);
      };
    },
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('worldkit', worldkitAPI);

// Type augmentation is in src/shared/types/ipc.ts
