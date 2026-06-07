/**
 * IPC Type Definitions
 *
 * Defines the typed API surface exposed to the renderer process
 * via contextBridge. All IPC communication is typed for safety.
 */

import type {
  TemplateInfo,
  TemplateData,
  ListTemplatesResult,
  LoadTemplateResult,
} from './template';

// Re-export template types for convenience
export type { TemplateInfo, TemplateData, ListTemplatesResult, LoadTemplateResult };

/**
 * Valid app path names that can be requested
 */
export type AppPathName = 'userData' | 'documents' | 'temp' | 'home' | 'appData';

/**
 * System API - Application and platform information
 */
export interface SystemAPI {
  /**
   * Get the application version from package.json
   */
  getAppVersion: () => Promise<string>;

  /**
   * Get the current platform (win32, darwin, linux)
   */
  getPlatform: () => Promise<NodeJS.Platform>;

  /**
   * Get a special app directory path
   * @param name - The path name to retrieve
   */
  getAppPath: (name: AppPathName) => Promise<string>;
}

/**
 * Result of importing a 3D model
 */
export interface ImportModelResult {
  /** Whether the import was successful */
  success: boolean;
  /** File path of the imported model (if successful) */
  filePath?: string;
  /** File name for display */
  fileName?: string;
  /** Error message if import failed */
  error?: string;
  /** Whether the user cancelled the dialog */
  cancelled?: boolean;
}

/**
 * Result of reading a file as base64
 */
export interface ReadFileBase64Result {
  /** Whether the read was successful */
  success: boolean;
  /** Base64-encoded file data */
  data?: string;
  /** MIME type of the file */
  mimeType?: string;
  /** Error message if read failed */
  error?: string;
}

/**
 * File API - File system operations
 */
export interface FileAPI {
  /**
   * Show dialog to import a 3D model (GLB/GLTF)
   * @returns Import result with file path or error
   */
  importModel: () => Promise<ImportModelResult>;

  /**
   * Read a file and return it as base64 data
   * @param filePath - Absolute path to the file
   * @returns Base64-encoded file data
   */
  readFileBase64: (filePath: string) => Promise<ReadFileBase64Result>;
}

/**
 * Result of the unsaved changes dialog
 */
export type UnsavedChangesResult = 'save' | 'discard' | 'cancel';

/**
 * Request to save a project
 */
export interface SaveProjectRequest {
  /** Project name for dialog title */
  projectName?: string;
  /** Path to save to (if null, will show save dialog) */
  path?: string;
  /** VEML content to save */
  vemlContent: string;
  /** Model files to copy to assets folder */
  modelFiles?: string[];
}

/**
 * Result of saving a project
 */
export interface SaveProjectResult {
  /** Whether the save was successful */
  success: boolean;
  /** Path where project was saved */
  path?: string;
  /** Error message if save failed */
  error?: string;
  /** Whether the user cancelled the save dialog */
  cancelled?: boolean;
}

/**
 * Result of opening a project
 */
export interface OpenProjectResult {
  /** Whether the open was successful */
  success: boolean;
  /** Path of the opened project */
  path?: string;
  /** Project name from folder */
  name?: string;
  /** VEML content of the project */
  vemlContent?: string;
  /** Error message if open failed */
  error?: string;
  /** Whether the user cancelled the open dialog */
  cancelled?: boolean;
}

/**
 * Primitive types that can be added to the scene
 */
export type PrimitiveType =
  | 'cube'
  | 'sphere'
  | 'plane'
  | 'cylinder'
  | 'capsule'
  | 'torus'
  | 'cone'
  | 'pyramid'
  | 'tetrahedron'
  | 'prism'
  | 'arch';

/**
 * User preferences
 */
export interface Preferences {
  /** Whether auto-save is enabled */
  autoSaveEnabled: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;
}

/**
 * Auto-save request
 */
export interface AutoSaveRequest {
  /** VEML content to save */
  vemlContent: string;
  /** Model file paths to include */
  modelFiles?: string[];
}

/**
 * Auto-save result
 */
export interface AutoSaveResult {
  /** Whether the auto-save was successful */
  success: boolean;
  /** Timestamp of the auto-save */
  timestamp?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Recovery check result
 */
export interface RecoveryCheckResult {
  /** Whether recovery data is available */
  hasRecovery: boolean;
  /** Timestamp of the auto-save */
  autoSaveTime?: string;
  /** Timestamp of the last manual save */
  lastSaveTime?: string;
  /** Whether the auto-save is newer than the last save */
  isAutoSaveNewer?: boolean;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  /** VEML content from auto-save */
  vemlContent?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Recent project entry
 */
export interface RecentProject {
  /** Project name */
  name: string;
  /** Full path to the .wk folder */
  path: string;
  /** Last modified/opened timestamp (ISO string) */
  lastOpened: string;
  /** Whether the project path still exists */
  exists?: boolean;
}

/**
 * Result of getting recent projects
 */
export interface GetRecentProjectsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** List of recent projects */
  projects: RecentProject[];
  /** Error message if operation failed */
  error?: string;
}

/**
 * Project API - Project management operations
 */
export interface ProjectAPI {
  /**
   * Register a callback for when a new project should be created
   * Called when user selects File > New World or presses Ctrl+N
   * @param callback - Function to call when new project event is received
   * @returns Cleanup function to remove the listener
   */
  onNewProject: (callback: () => void) => () => void;

  /**
   * Register a callback for when save is triggered from menu
   * Called when user selects File > Save or presses Ctrl+S
   * @param callback - Function to call when save event is received
   * @returns Cleanup function to remove the listener
   */
  onSaveTrigger: (callback: () => void) => () => void;

  /**
   * Register a callback for when open is triggered from menu
   * Called when user selects File > Open or presses Ctrl+O
   * @param callback - Function to call when open event is received
   * @returns Cleanup function to remove the listener
   */
  onOpenTrigger: (callback: () => void) => () => void;

  /**
   * Show the unsaved changes dialog
   * @returns User's choice: 'save', 'discard', or 'cancel'
   */
  showUnsavedChangesDialog: () => Promise<UnsavedChangesResult>;

  /**
   * Save project to disk (uses existing path or shows save dialog)
   * @param request - Save request with VEML content and optional path
   * @returns Result with success status and path
   */
  save: (request: SaveProjectRequest) => Promise<SaveProjectResult>;

  /**
   * Save project to new location (always shows save dialog)
   * @param request - Save request with VEML content
   * @returns Result with success status and path
   */
  saveAs: (request: SaveProjectRequest) => Promise<SaveProjectResult>;

  /**
   * Open project from disk (shows open dialog)
   * @returns Result with VEML content and project path
   */
  open: () => Promise<OpenProjectResult>;

  /**
   * Get list of recent projects
   * @returns List of recent projects with existence check
   */
  getRecent: () => Promise<GetRecentProjectsResult>;

  /**
   * Add a project to the recent list
   * @param project - Project to add
   */
  addRecent: (project: { name: string; path: string }) => Promise<void>;

  /**
   * Remove a project from the recent list
   * @param path - Path of project to remove
   */
  removeRecent: (path: string) => Promise<void>;

  /**
   * Clear all recent projects
   */
  clearRecent: () => Promise<void>;

  /**
   * Register a callback for when the recent projects list updates
   * @param callback - Function to call with updated projects
   * @returns Cleanup function to remove the listener
   */
  onRecentUpdated: (callback: (projects: RecentProject[]) => void) => () => void;

  /**
   * Open a specific project by path (skips file dialog)
   * @param path - Path to the project to open
   * @returns Result with VEML content and project path
   */
  openPath: (path: string) => Promise<OpenProjectResult>;

  /**
   * Register a callback for when a recent project should be opened from menu
   * @param callback - Function to call with the project path
   * @returns Cleanup function to remove the listener
   */
  onOpenRecent: (callback: (path: string) => void) => () => void;

  /**
   * Auto-save the current project
   * @param request - Auto-save request with VEML content
   * @returns Result with success status
   */
  autoSave: (request: AutoSaveRequest) => Promise<AutoSaveResult>;

  /**
   * Check if there's an auto-save to recover from
   * @returns Recovery check result
   */
  checkRecovery: () => Promise<RecoveryCheckResult>;

  /**
   * Recover from auto-save
   * @returns Recovery result with VEML content
   */
  recover: () => Promise<RecoveryResult>;

  /**
   * Discard auto-save recovery data
   */
  discardRecovery: () => Promise<void>;
}

/**
 * Preferences API - User preferences management
 */
export interface PreferencesAPI {
  /**
   * Get all preferences
   * @returns Current preferences
   */
  getAll: () => Promise<Preferences>;

  /**
   * Set a preference value
   * @param key - Preference key
   * @param value - New value
   */
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
}

/**
 * Scene API - Scene manipulation operations
 */
export interface SceneAPI {
  /**
   * Register a callback for when a primitive should be added to the scene
   * Called when user selects Edit > Add > Primitive or uses keyboard shortcut
   * @param callback - Function to call with the primitive type
   * @returns Cleanup function to remove the listener
   */
  onAddPrimitive: (callback: (type: PrimitiveType) => void) => () => void;

  /**
   * Register a callback for when a 3D model should be imported
   * Called when user selects File > Import Model
   * @param callback - Function to call with the import result
   * @returns Cleanup function to remove the listener
   */
  onImportModel: (callback: (result: ImportModelResult) => void) => () => void;
}

/**
 * Window API - Window management operations
 */
export interface WindowAPI {
  /**
   * Set the window title
   * @param title - The new window title
   */
  setTitle: (title: string) => Promise<boolean>;
}

/**
 * File Open API - Handlers for file association events
 */
export interface FileOpenAPI {
  /**
   * Register a callback for when a .worldkit project file is opened
   * @param callback - Function to call with the file path
   * @returns Cleanup function to remove the listener
   */
  onProjectOpen: (callback: (filePath: string) => void) => () => void;

  /**
   * Register a callback for when a .veml file is opened
   * @param callback - Function to call with the file path
   * @returns Cleanup function to remove the listener
   */
  onVemlOpen: (callback: (filePath: string) => void) => () => void;
}

/**
 * Deep Link API - Handlers for worldkit:// protocol events
 */
export interface DeepLinkAPI {
  /**
   * Register a callback for when a file is opened via deep link
   * @param callback - Function to call with the file path
   * @returns Cleanup function to remove the listener
   */
  onOpenFile: (callback: (filePath: string) => void) => () => void;

  /**
   * Register a callback for when a template is opened via deep link
   * @param callback - Function to call with the template name
   * @returns Cleanup function to remove the listener
   */
  onOpenTemplate: (callback: (templateName: string) => void) => () => void;
}

/**
 * Update state representing the auto-update lifecycle
 */
export type UpdateState =
  | 'idle'
  | 'checking'
  | 'update-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'no-update';

/**
 * Update status information
 */
export interface UpdateStatus {
  /** Current state of the update process */
  state: UpdateState;
  /** Version of the available/downloaded update */
  version?: string;
  /** Release notes for the update */
  releaseNotes?: string;
  /** Release date of the update */
  releaseDate?: string;
  /** Download progress (0-100) */
  progress?: number;
  /** Error message if state is 'error' */
  error?: string;
}

/**
 * Update API - Auto-update functionality
 */
export interface UpdateAPI {
  /**
   * Check for available updates
   * @returns Current update status after check
   */
  checkForUpdates: () => Promise<UpdateStatus>;

  /**
   * Get the current update status
   * @returns Current update status
   */
  getStatus: () => Promise<UpdateStatus>;

  /**
   * Quit the app and install the downloaded update
   * Note: This will close the app
   */
  quitAndInstall: () => Promise<void>;

  /**
   * Register a callback for update status changes
   * @param callback - Function to call with the update status
   * @returns Cleanup function to remove the listener
   */
  onStatusChange: (callback: (status: UpdateStatus) => void) => () => void;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  /** Whether the network is currently online */
  online: boolean;
}

/**
 * Network API - Network connectivity detection
 */
export interface NetworkAPI {
  /**
   * Get the current network status
   * @returns Current network status
   */
  getStatus: () => Promise<NetworkStatus>;

  /**
   * Register a callback for network status changes
   * @param callback - Function to call with the network status
   * @returns Cleanup function to remove the listener
   */
  onStatusChange: (callback: (status: NetworkStatus) => void) => () => void;
}

/**
 * Template API - World template operations
 */
export interface TemplateAPI {
  /**
   * Get list of available templates
   * @returns List of template info
   */
  listTemplates: () => Promise<ListTemplatesResult>;

  /**
   * Load a template by ID
   * @param templateId - The template ID to load
   * @returns Template data with entities
   */
  loadTemplate: (templateId: string) => Promise<LoadTemplateResult>;
}

/**
 * WebVerse detection result
 */
export interface WebVerseDetectionResult {
  /** Whether WebVerse is installed */
  installed: boolean;
  /** Path to the WebVerse executable (if found) */
  path?: string;
  /** Version of WebVerse (if detected) */
  version?: string;
  /** Type of installation found */
  type?: 'desktop' | 'runtime';
}

/**
 * Result of browsing for WebVerse executable
 */
export interface WebVerseBrowseResult {
  /** Whether a file was selected */
  success: boolean;
  /** Path to the selected executable */
  path?: string;
  /** Whether the user cancelled the dialog */
  cancelled?: boolean;
  /** Error message if browse failed */
  error?: string;
}

/**
 * Request to export VEML file
 */
export interface ExportVemlRequest {
  /** VEML content to export */
  vemlContent: string;
  /** Suggested file name */
  suggestedName?: string;
}

/**
 * Result of exporting VEML file
 */
export interface ExportVemlResult {
  /** Whether the export was successful */
  success: boolean;
  /** Path where file was saved */
  path?: string;
  /** Error message if export failed */
  error?: string;
  /** Whether the user cancelled the dialog */
  cancelled?: boolean;
}

/**
 * Export API - VEML export operations
 */
export interface ExportAPI {
  /**
   * Export VEML to file (shows save dialog)
   * @param request - Export request with VEML content
   * @returns Export result with file path
   */
  exportVeml: (request: ExportVemlRequest) => Promise<ExportVemlResult>;

  /**
   * Register a callback for when export is triggered from menu
   * @param callback - Function to call when export is triggered
   * @returns Cleanup function to remove the listener
   */
  onExportTrigger: (callback: () => void) => () => void;
}

/**
 * Edit API - Edit menu operations
 */
export interface EditAPI {
  /**
   * Register a callback for when undo is triggered from menu (Ctrl+Z)
   * @param callback - Function to call when undo is triggered
   * @returns Cleanup function to remove the listener
   */
  onUndo: (callback: () => void) => () => void;

  /**
   * Register a callback for when redo is triggered from menu (Ctrl+Y / Ctrl+Shift+Z)
   * @param callback - Function to call when redo is triggered
   * @returns Cleanup function to remove the listener
   */
  onRedo: (callback: () => void) => () => void;

  /**
   * Register a callback for when delete is triggered from menu
   * @param callback - Function to call when delete is triggered
   * @returns Cleanup function to remove the listener
   */
  onDelete: (callback: () => void) => () => void;
}

/**
 * View API - Panel visibility controls
 */
export interface ViewAPI {
  /**
   * Register a callback for when VEML code panel toggle is triggered from menu
   * @param callback - Function to call when toggle is triggered
   * @returns Cleanup function to remove the listener
   */
  onToggleVemlCode: (callback: () => void) => () => void;

  /**
   * Register a callback for when Scene Tree panel toggle is triggered from menu
   * @param callback - Function to call when toggle is triggered
   * @returns Cleanup function to remove the listener
   */
  onToggleSceneTree: (callback: () => void) => () => void;

  /**
   * Register a callback for when Properties panel toggle is triggered from menu
   * @param callback - Function to call when toggle is triggered
   * @returns Cleanup function to remove the listener
   */
  onToggleProperties: (callback: () => void) => () => void;

  /**
   * Register a callback for when Asset Library panel toggle is triggered from menu
   * @param callback - Function to call when toggle is triggered
   * @returns Cleanup function to remove the listener
   */
  onToggleAssetLibrary: (callback: () => void) => () => void;
}

/**
 * Preview launch state
 */
export type PreviewState =
  | 'idle'
  | 'preparing'
  | 'launching'
  | 'running'
  | 'error';

/**
 * Preview status information
 */
export interface PreviewStatus {
  /** Current state of the preview process */
  state: PreviewState;
  /** Path to the temp VEML file being previewed */
  tempFilePath?: string;
  /** Process ID of the WebVerse process */
  processId?: number;
  /** Error message if state is 'error' */
  error?: string;
}

/**
 * Request to launch preview
 */
export interface PreviewLaunchRequest {
  /** VEML content to preview */
  vemlContent: string;
  /** Project name for display */
  projectName?: string;
}

/**
 * Result of launching preview
 */
export interface PreviewLaunchResult {
  /** Whether the preview was launched successfully */
  success: boolean;
  /** Process ID of the WebVerse process */
  processId?: number;
  /** Path to the temp VEML file */
  tempFilePath?: string;
  /** Error message if launch failed */
  error?: string;
  /** Whether WebVerse was not found */
  webverseNotFound?: boolean;
}

/**
 * Preview API - WebVerse preview operations
 */
export interface PreviewAPI {
  /**
   * Launch preview in WebVerse
   * @param request - Preview launch request with VEML content
   * @returns Launch result
   */
  launch: (request: PreviewLaunchRequest) => Promise<PreviewLaunchResult>;

  /**
   * Register a callback for preview status changes
   * @param callback - Function to call with the preview status
   * @returns Cleanup function to remove the listener
   */
  onStatusChange: (callback: (status: PreviewStatus) => void) => () => void;

  /**
   * Register a callback for when preview is triggered from menu (F5)
   * @param callback - Function to call when preview is triggered
   * @returns Cleanup function to remove the listener
   */
  onTrigger: (callback: () => void) => () => void;
}

/**
 * WebVerse API - WebVerse detection and preview operations
 */
export interface WebVerseAPI {
  /**
   * Detect WebVerse installation
   * @returns Detection result with installation status
   */
  detect: () => Promise<WebVerseDetectionResult>;

  /**
   * Get cached WebVerse detection status
   * @returns Last detection result
   */
  getStatus: () => Promise<WebVerseDetectionResult>;

  /**
   * Open file dialog to browse for WebVerse executable
   * @returns Browse result with selected path
   */
  browse: () => Promise<WebVerseBrowseResult>;

  /**
   * Set custom WebVerse path
   * @param path - Path to the WebVerse executable
   * @returns Updated detection result
   */
  setPath: (path: string) => Promise<WebVerseDetectionResult>;
}

/**
 * Complete WorldKit API exposed to renderer
 */
export interface WorldKitAPI {
  /**
   * System information and platform APIs
   */
  system: SystemAPI;

  /**
   * File system operations
   */
  file: FileAPI;

  /**
   * Window management APIs
   */
  window: WindowAPI;

  /**
   * File open event handlers for file associations
   */
  fileOpen: FileOpenAPI;

  /**
   * Deep link event handlers for worldkit:// protocol
   */
  deepLink: DeepLinkAPI;

  /**
   * Auto-update functionality
   */
  update: UpdateAPI;

  /**
   * Network connectivity detection
   */
  network: NetworkAPI;

  /**
   * Project management operations
   */
  project: ProjectAPI;

  /**
   * Scene manipulation operations
   */
  scene: SceneAPI;

  /**
   * World template operations
   */
  template: TemplateAPI;

  /**
   * User preferences
   */
  preferences: PreferencesAPI;

  /**
   * WebVerse detection and preview operations
   */
  webverse: WebVerseAPI;

  /**
   * VEML export operations
   */
  export: ExportAPI;

  /**
   * Edit menu operations (undo, redo, delete)
   */
  edit: EditAPI;

  /**
   * View/panel visibility controls
   */
  view: ViewAPI;

  /**
   * Preview in WebVerse
   */
  preview: PreviewAPI;

  /**
   * Version of the API (for compatibility checking)
   */
  version: string;
}

/**
 * Augment the global Window interface
 */
declare global {
  interface Window {
    /**
     * WorldKit API exposed via contextBridge
     * Only available in the Electron renderer process
     */
    worldkit: WorldKitAPI;
  }
}

// Export for use in other modules
export type { WorldKitAPI as default };
