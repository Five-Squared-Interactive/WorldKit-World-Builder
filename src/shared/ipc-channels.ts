/**
 * IPC Channel Definitions
 * Pattern: worldkit:{domain}:{action}
 *
 * All IPC communication between main and renderer processes
 * must use these channel constants for type safety and consistency.
 */

// Channel name builder for type safety
const channel = <D extends string, A extends string>(domain: D, action: A) =>
  `worldkit:${domain}:${action}` as const;

/**
 * System domain channels - Application and platform info
 */
export const SystemChannels = {
  GET_APP_VERSION: channel('system', 'getAppVersion'),
  GET_PLATFORM: channel('system', 'getPlatform'),
  GET_APP_PATH: channel('system', 'getAppPath'),
} as const;

/**
 * File domain channels - File system operations
 */
export const FileChannels = {
  READ: channel('file', 'read'),
  WRITE: channel('file', 'write'),
  EXISTS: channel('file', 'exists'),
  SHOW_SAVE_DIALOG: channel('file', 'showSaveDialog'),
  SHOW_OPEN_DIALOG: channel('file', 'showOpenDialog'),
  /** Show file dialog for importing 3D models (GLB/GLTF) */
  IMPORT_MODEL: channel('file', 'importModel'),
  /** Read file as base64 for loading in renderer */
  READ_FILE_BASE64: channel('file', 'readFileBase64'),
} as const;

/**
 * Project domain channels - Project management
 */
export const ProjectChannels = {
  /** Main → Renderer: New project event triggered from menu */
  NEW: channel('project', 'new'),
  /** Renderer → Main: Show unsaved changes dialog */
  SHOW_UNSAVED_DIALOG: channel('project', 'showUnsavedDialog'),
  /** Renderer → Main: Open project from disk */
  OPEN: channel('project', 'open'),
  /** Renderer → Main: Save project to path (or prompt for new path) */
  SAVE: channel('project', 'save'),
  /** Renderer → Main: Show save dialog and save to new location */
  SAVE_AS: channel('project', 'saveAs'),
  /** Renderer → Main: Get list of recent projects */
  GET_RECENT: channel('project', 'getRecent'),
  /** Renderer → Main: Add a project to recent list */
  ADD_RECENT: channel('project', 'addRecent'),
  /** Renderer → Main: Remove a project from recent list */
  REMOVE_RECENT: channel('project', 'removeRecent'),
  /** Renderer → Main: Clear all recent projects */
  CLEAR_RECENT: channel('project', 'clearRecent'),
  /** Main → Renderer: Recent projects list updated */
  RECENT_UPDATED: channel('project', 'recentUpdated'),
  /** Renderer → Main: Open a specific project by path */
  OPEN_PATH: channel('project', 'openPath'),
  /** Main → Renderer: Open a recent project by path (from menu) */
  OPEN_RECENT: channel('project', 'openRecent'),
  /** Renderer → Main: Auto-save current project */
  AUTOSAVE: channel('project', 'autosave'),
  /** Renderer → Main: Check for autosave recovery */
  CHECK_RECOVERY: channel('project', 'checkRecovery'),
  /** Renderer → Main: Recover from autosave */
  RECOVER: channel('project', 'recover'),
  /** Renderer → Main: Discard autosave */
  DISCARD_RECOVERY: channel('project', 'discardRecovery'),
  /** Main → Renderer: Trigger save from menu (Ctrl+S) */
  TRIGGER_SAVE: channel('project', 'triggerSave'),
  /** Main → Renderer: Trigger open from menu (Ctrl+O) */
  TRIGGER_OPEN: channel('project', 'triggerOpen'),
} as const;

/**
 * Template domain channels - World templates
 */
export const TemplateChannels = {
  /** Get list of available templates */
  LIST: channel('template', 'list'),
  /** Load a template by ID */
  LOAD: channel('template', 'load'),
} as const;

/**
 * Window domain channels - Window management
 */
export const WindowChannels = {
  SET_TITLE: channel('window', 'setTitle'),
} as const;

/**
 * Tray domain channels - System tray actions
 */
export const TrayChannels = {
  NEW_WORLD: channel('tray', 'newWorld'),
  SHOW_WINDOW: channel('tray', 'showWindow'),
  HIDE_WINDOW: channel('tray', 'hideWindow'),
} as const;

/**
 * File Open domain channels - File association handlers
 * Used when files are opened via double-click or command line
 */
export const FileOpenChannels = {
  PROJECT: channel('file-open', 'project'),
  VEML: channel('file-open', 'veml'),
} as const;

/**
 * Deep Link domain channels - Protocol handler actions
 * Used when worldkit:// URLs are opened
 */
export const DeepLinkChannels = {
  OPEN_FILE: channel('deep-link', 'open-file'),
  OPEN_TEMPLATE: channel('deep-link', 'open-template'),
} as const;

/**
 * Update domain channels - Auto-update functionality
 * Used for update status notifications and user actions
 */
export const UpdateChannels = {
  /** Main → Renderer: Update status changed */
  STATUS: channel('update', 'status'),
  /** Renderer → Main: Check for updates */
  CHECK: channel('update', 'check'),
  /** Renderer → Main: Quit and install update */
  QUIT_AND_INSTALL: channel('update', 'quitAndInstall'),
  /** Renderer → Main: Get current update status */
  GET_STATUS: channel('update', 'getStatus'),
} as const;

/**
 * Network domain channels - Network connectivity detection
 * Used for offline mode detection and status notifications
 */
export const NetworkChannels = {
  /** Main → Renderer: Network status changed */
  STATUS: channel('network', 'status'),
  /** Renderer → Main: Get current network status */
  GET_STATUS: channel('network', 'getStatus'),
} as const;

/**
 * Scene domain channels - Scene manipulation operations
 * Used for adding objects, manipulating the scene graph, etc.
 */
export const SceneChannels = {
  /** Main → Renderer: Add a primitive object to the scene */
  ADD_PRIMITIVE: channel('scene', 'add-primitive'),
  /** Main → Renderer: Import a 3D model to the scene */
  IMPORT_MODEL: channel('scene', 'import-model'),
} as const;

/**
 * Preferences domain channels - User preferences
 */
export const PreferencesChannels = {
  /** Renderer → Main: Get all preferences */
  GET: channel('preferences', 'get'),
  /** Renderer → Main: Set a preference */
  SET: channel('preferences', 'set'),
} as const;

/**
 * Cache domain channels - Asset caching operations
 */
export const CacheChannels = {
  /** Check if an asset is cached */
  IS_CACHED: channel('cache', 'is-cached'),
  /** Get cache entry info */
  GET_ENTRY: channel('cache', 'get-entry'),
  /** Get path to cached file */
  GET_PATH: channel('cache', 'get-path'),
  /** Cache an asset */
  CACHE_ASSET: channel('cache', 'cache-asset'),
  /** Read cached asset data */
  READ_CACHED: channel('cache', 'read-cached'),
  /** Remove from cache */
  REMOVE: channel('cache', 'remove'),
  /** Clear entire cache */
  CLEAR: channel('cache', 'clear'),
  /** Get cache statistics */
  GET_STATS: channel('cache', 'get-stats'),
} as const;

/**
 * WebVerse domain channels - WebVerse detection and preview
 * Used for detecting WebVerse installation and launching previews
 */
export const WebVerseChannels = {
  /** Renderer → Main: Detect WebVerse installation */
  DETECT: channel('webverse', 'detect'),
  /** Renderer → Main: Get cached detection result */
  GET_STATUS: channel('webverse', 'getStatus'),
  /** Renderer → Main: Browse for WebVerse executable */
  BROWSE: channel('webverse', 'browse'),
  /** Renderer → Main: Set custom WebVerse path */
  SET_PATH: channel('webverse', 'setPath'),
} as const;

/**
 * Export domain channels - VEML export operations
 * Used for exporting scenes to VEML format
 */
export const ExportChannels = {
  /** Renderer → Main: Export VEML to file (shows save dialog) */
  VEML: channel('export', 'veml'),
  /** Main → Renderer: Trigger export from menu */
  TRIGGER_EXPORT: channel('export', 'triggerExport'),
} as const;

/**
 * Edit domain channels - Editing operations triggered from menu
 * Used for undo/redo/delete when triggered from menu items
 */
export const EditChannels = {
  /** Main → Renderer: Trigger undo from menu (Ctrl+Z) */
  UNDO: channel('edit', 'undo'),
  /** Main → Renderer: Trigger redo from menu (Ctrl+Y / Ctrl+Shift+Z) */
  REDO: channel('edit', 'redo'),
  /** Main → Renderer: Trigger delete from menu */
  DELETE: channel('edit', 'delete'),
} as const;

/**
 * View domain channels - Panel visibility controls
 * Used for toggling panels from menu
 */
export const ViewChannels = {
  /** Main → Renderer: Toggle VEML code panel */
  TOGGLE_VEML_CODE: channel('view', 'toggleVemlCode'),
  /** Main → Renderer: Toggle Scene Tree panel */
  TOGGLE_SCENE_TREE: channel('view', 'toggleSceneTree'),
  /** Main → Renderer: Toggle Properties panel */
  TOGGLE_PROPERTIES: channel('view', 'toggleProperties'),
  /** Main → Renderer: Toggle Asset Library panel */
  TOGGLE_ASSET_LIBRARY: channel('view', 'toggleAssetLibrary'),
} as const;

/**
 * Preview domain channels - Preview in WebVerse
 * Used for launching the world preview in WebVerse runtime
 */
export const PreviewChannels = {
  /** Renderer → Main: Launch preview in WebVerse */
  LAUNCH: channel('preview', 'launch'),
  /** Main → Renderer: Preview status changed */
  STATUS: channel('preview', 'status'),
  /** Main → Renderer: Trigger preview from menu (F5) */
  TRIGGER: channel('preview', 'trigger'),
} as const;

/**
 * All channels grouped by domain
 */
export const Channels = {
  System: SystemChannels,
  File: FileChannels,
  FileOpen: FileOpenChannels,
  DeepLink: DeepLinkChannels,
  Project: ProjectChannels,
  Template: TemplateChannels,
  Window: WindowChannels,
  Tray: TrayChannels,
  Update: UpdateChannels,
  Network: NetworkChannels,
  Scene: SceneChannels,
  Preferences: PreferencesChannels,
  Cache: CacheChannels,
  WebVerse: WebVerseChannels,
  Export: ExportChannels,
  Edit: EditChannels,
  View: ViewChannels,
  Preview: PreviewChannels,
} as const;

// Type extraction helpers
export type SystemChannel = (typeof SystemChannels)[keyof typeof SystemChannels];
export type FileChannel = (typeof FileChannels)[keyof typeof FileChannels];
export type FileOpenChannel = (typeof FileOpenChannels)[keyof typeof FileOpenChannels];
export type DeepLinkChannel = (typeof DeepLinkChannels)[keyof typeof DeepLinkChannels];
export type ProjectChannel = (typeof ProjectChannels)[keyof typeof ProjectChannels];
export type TemplateChannel = (typeof TemplateChannels)[keyof typeof TemplateChannels];
export type WindowChannel = (typeof WindowChannels)[keyof typeof WindowChannels];
export type TrayChannel = (typeof TrayChannels)[keyof typeof TrayChannels];
export type UpdateChannel = (typeof UpdateChannels)[keyof typeof UpdateChannels];
export type NetworkChannel = (typeof NetworkChannels)[keyof typeof NetworkChannels];
export type SceneChannel = (typeof SceneChannels)[keyof typeof SceneChannels];
export type PreferencesChannel = (typeof PreferencesChannels)[keyof typeof PreferencesChannels];
export type CacheChannel = (typeof CacheChannels)[keyof typeof CacheChannels];
export type WebVerseChannel = (typeof WebVerseChannels)[keyof typeof WebVerseChannels];
export type ExportChannel = (typeof ExportChannels)[keyof typeof ExportChannels];
export type EditChannel = (typeof EditChannels)[keyof typeof EditChannels];
export type ViewChannel = (typeof ViewChannels)[keyof typeof ViewChannels];
export type PreviewChannel = (typeof PreviewChannels)[keyof typeof PreviewChannels];
export type AnyChannel =
  | SystemChannel
  | FileChannel
  | FileOpenChannel
  | DeepLinkChannel
  | ProjectChannel
  | TemplateChannel
  | WindowChannel
  | TrayChannel
  | UpdateChannel
  | NetworkChannel
  | SceneChannel
  | CacheChannel
  | WebVerseChannel
  | ExportChannel
  | EditChannel
  | ViewChannel
  | PreviewChannel;
