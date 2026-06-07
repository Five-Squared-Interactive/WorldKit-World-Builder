/**
 * Stores Barrel Export
 *
 * Central export point for all Zustand stores.
 * Import stores from here for clean imports.
 */

// Scene Store - Entity management and scene graph
export {
  useSceneStore,
  selectEntityCount,
  selectEntityExists,
  type SceneState,
  type SceneActions,
  type SceneStore,
} from './sceneStore';

// Selection Store - Entity selection management
export {
  useSelectionStore,
  selectPrimarySelection,
  selectHasMultipleSelection,
  selectHasSelection,
  type SelectionState,
  type SelectionActions,
  type SelectionStore,
} from './selectionStore';

// UI Store - UI state management
export {
  useUIStore,
  ToolMode,
  PanelId,
  selectIsPanelVisible,
  selectToolMode,
  selectIsToolMode,
  type PanelVisibility,
  type UIState,
  type UIActions,
  type UIStore,
} from './uiStore';

// Command Store - Undo/redo management
export {
  useCommandStore,
  selectUndoStackSize,
  selectRedoStackSize,
  type Command,
  type CommandState,
  type CommandActions,
  type CommandStore,
} from './commandStore';

// Project Store - Project metadata management
export {
  useProjectStore,
  selectHasBeenSaved,
  selectNeedsSavePrompt,
  selectFileName,
  type ProjectMetadata,
  type RecentProject,
  type ProjectState,
  type ProjectActions,
  type ProjectStore,
} from './projectStore';

// Asset Store - Asset library management
export {
  useAssetStore,
  selectAssetById,
  selectAssetsByCategory,
  selectAssetCount,
  type AssetState,
  type AssetActions,
  type AssetStore,
} from './assetStore';

// Clipboard Store - Cut/copy/paste management
export {
  useClipboardStore,
  selectHasClipboardContent,
  selectClipboardOperation,
  type ClipboardEntry,
  type SerializedEntity,
  type ClipboardState,
  type ClipboardActions,
  type ClipboardStore,
} from './clipboardStore';
