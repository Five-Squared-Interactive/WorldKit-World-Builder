/**
 * UI Store
 *
 * Zustand store for managing UI state like tool modes,
 * panel visibility, and loading states.
 */

import { create } from 'zustand';
import type { PreviewStatus } from '../../shared/types/ipc';

/**
 * Tool modes for the editor
 */
export enum ToolMode {
  Select = 'select',
  Move = 'move',
  Rotate = 'rotate',
  Scale = 'scale',
}

/**
 * Panel identifiers for visibility control
 */
export enum PanelId {
  Hierarchy = 'hierarchy',
  Properties = 'properties',
  Assets = 'assets',
  Timeline = 'timeline',
  VemlCode = 'vemlCode',
}

/**
 * Panel visibility state
 */
export type PanelVisibility = Record<PanelId, boolean>;

/**
 * WebVerse installation status
 */
export interface WebVerseStatus {
  /** Whether WebVerse is installed */
  installed: boolean;
  /** Path to the WebVerse executable */
  path?: string;
  /** Type of installation (desktop or runtime) */
  type?: 'desktop' | 'runtime';
  /** Version of WebVerse (if detected) */
  version?: string;
}

/**
 * UI store state interface
 */
export interface UIState {
  /** Current tool mode */
  toolMode: ToolMode;

  /** Panel visibility states */
  panelVisibility: PanelVisibility;

  /** Global loading state */
  isLoading: boolean;

  /** Loading message (displayed when isLoading is true) */
  loadingMessage: string | null;

  /** Whether the welcome screen is shown */
  showWelcome: boolean;

  /** Network connectivity status */
  isOnline: boolean;

  /** Whether snapping is enabled */
  snappingEnabled: boolean;

  /** WebVerse installation status */
  webverseStatus: WebVerseStatus;

  /** Preview launch status */
  previewStatus: PreviewStatus;

  /** Status bar message */
  statusMessage: string | null;

  /** Whether the new project dialog is open */
  newProjectDialogOpen: boolean;
}

/**
 * UI store actions interface
 */
export interface UIActions {
  /**
   * Set the current tool mode
   * @param mode - The tool mode to set
   */
  setToolMode: (mode: ToolMode) => void;

  /**
   * Toggle a panel's visibility
   * @param panelId - The panel to toggle
   */
  togglePanel: (panelId: PanelId) => void;

  /**
   * Set a panel's visibility explicitly
   * @param panelId - The panel to set
   * @param visible - Whether the panel should be visible
   */
  setPanelVisibility: (panelId: PanelId, visible: boolean) => void;

  /**
   * Set the loading state
   * @param isLoading - Whether the app is loading
   * @param message - Optional loading message
   */
  setLoading: (isLoading: boolean, message?: string) => void;

  /**
   * Set the welcome screen visibility
   * @param show - Whether to show the welcome screen
   */
  setShowWelcome: (show: boolean) => void;

  /**
   * Set the network connectivity status
   * @param online - Whether the network is online
   */
  setOnline: (online: boolean) => void;

  /**
   * Toggle snapping on/off
   */
  toggleSnapping: () => void;

  /**
   * Set snapping enabled state
   * @param enabled - Whether snapping is enabled
   */
  setSnapping: (enabled: boolean) => void;

  /**
   * Set WebVerse installation status
   * @param status - The WebVerse status to set
   */
  setWebVerseStatus: (status: WebVerseStatus) => void;

  /**
   * Set preview status
   * @param status - The preview status to set
   */
  setPreviewStatus: (status: PreviewStatus) => void;

  /**
   * Set status bar message
   * @param message - The message to display, or null to clear
   */
  setStatusMessage: (message: string | null) => void;

  /**
   * Reset UI to default state
   */
  resetUI: () => void;

  /**
   * Open the new project dialog
   */
  openNewProjectDialog: () => void;

  /**
   * Close the new project dialog
   */
  closeNewProjectDialog: () => void;
}

/**
 * Combined UI store type
 */
export type UIStore = UIState & UIActions;

/**
 * Default panel visibility
 */
const defaultPanelVisibility: PanelVisibility = {
  [PanelId.Hierarchy]: true,
  [PanelId.Properties]: true,
  [PanelId.Assets]: false,
  [PanelId.Timeline]: false,
  [PanelId.VemlCode]: false,
};

/**
 * Initial state for the UI store
 */
const initialState: UIState = {
  toolMode: ToolMode.Select,
  panelVisibility: { ...defaultPanelVisibility },
  isLoading: false,
  loadingMessage: null,
  showWelcome: true,
  isOnline: true, // Assume online until we know otherwise
  snappingEnabled: true, // Snapping enabled by default
  webverseStatus: { installed: false }, // Unknown until detected
  previewStatus: { state: 'idle' }, // Preview not launched
  statusMessage: null, // No status bar message
  newProjectDialogOpen: false, // New project dialog closed by default
};

/**
 * UI store instance
 */
export const useUIStore = create<UIStore>((set) => ({
  // State
  ...initialState,

  // Actions
  setToolMode: (mode) => set({ toolMode: mode }),

  togglePanel: (panelId) =>
    set((state) => ({
      panelVisibility: {
        ...state.panelVisibility,
        [panelId]: !state.panelVisibility[panelId],
      },
    })),

  setPanelVisibility: (panelId, visible) =>
    set((state) => ({
      panelVisibility: {
        ...state.panelVisibility,
        [panelId]: visible,
      },
    })),

  setLoading: (isLoading, message) =>
    set({
      isLoading,
      loadingMessage: isLoading ? (message ?? null) : null,
    }),

  setShowWelcome: (show) => set({ showWelcome: show }),

  setOnline: (online) => set({ isOnline: online }),

  toggleSnapping: () =>
    set((state) => ({ snappingEnabled: !state.snappingEnabled })),

  setSnapping: (enabled) => set({ snappingEnabled: enabled }),

  setWebVerseStatus: (status) => set({ webverseStatus: status }),

  setPreviewStatus: (status) => set({ previewStatus: status }),

  setStatusMessage: (message) => set({ statusMessage: message }),

  openNewProjectDialog: () => set({ newProjectDialogOpen: true }),

  closeNewProjectDialog: () => set({ newProjectDialogOpen: false }),

  resetUI: () => set(initialState),
}));

/**
 * Selector: Check if a specific panel is visible
 */
export const selectIsPanelVisible = (state: UIState, panelId: PanelId): boolean =>
  state.panelVisibility[panelId];

/**
 * Selector: Get current tool mode
 */
export const selectToolMode = (state: UIState): ToolMode => state.toolMode;

/**
 * Selector: Check if app is in a specific tool mode
 */
export const selectIsToolMode = (state: UIState, mode: ToolMode): boolean =>
  state.toolMode === mode;

/**
 * Selector: Check if the network is online
 */
export const selectIsOnline = (state: UIState): boolean => state.isOnline;

/**
 * Selector: Check if snapping is enabled
 */
export const selectSnappingEnabled = (state: UIState): boolean => state.snappingEnabled;

/**
 * Selector: Check if WebVerse is installed
 */
export const selectWebVerseInstalled = (state: UIState): boolean => state.webverseStatus.installed;

/**
 * Selector: Get WebVerse status
 */
export const selectWebVerseStatus = (state: UIState): WebVerseStatus => state.webverseStatus;

/**
 * Selector: Get preview status
 */
export const selectPreviewStatus = (state: UIState): PreviewStatus => state.previewStatus;

/**
 * Selector: Check if preview is launching
 */
export const selectIsPreviewLaunching = (state: UIState): boolean =>
  state.previewStatus.state === 'preparing' || state.previewStatus.state === 'launching';

/**
 * Selector: Get status bar message
 */
export const selectStatusMessage = (state: UIState): string | null => state.statusMessage;
