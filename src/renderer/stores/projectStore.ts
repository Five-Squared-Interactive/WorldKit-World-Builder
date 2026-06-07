/**
 * Project Store
 *
 * Zustand store for managing project metadata and state.
 * Handles project lifecycle (new, open, save) and tracks dirty state.
 */

import { create } from 'zustand';

/**
 * Project metadata interface
 */
export interface ProjectMetadata {
  /** Project display name */
  name: string;

  /** File path (null for unsaved projects) */
  path: string | null;

  /** Last saved timestamp (null if never saved) */
  lastSaved: Date | null;

  /** Project description */
  description: string;

  /** Author name */
  author: string;
}

/**
 * Recent project entry
 */
export interface RecentProject {
  /** Project name */
  name: string;

  /** File path */
  path: string;

  /** Last opened timestamp */
  lastOpened: Date;
}

/**
 * Project store state interface
 */
export interface ProjectState {
  /** Current project metadata */
  metadata: ProjectMetadata;

  /** Whether the project is new (never saved) */
  isNew: boolean;

  /** Whether there are unsaved changes */
  isDirty: boolean;

  /** List of recently opened projects */
  recentProjects: RecentProject[];
}

/**
 * Project store actions interface
 */
export interface ProjectActions {
  /**
   * Set the current project
   * @param metadata - Project metadata
   * @param isNew - Whether this is a new project
   */
  setProject: (metadata: ProjectMetadata, isNew?: boolean) => void;

  /**
   * Update project metadata
   * @param updates - Partial metadata updates
   */
  updateMetadata: (updates: Partial<ProjectMetadata>) => void;

  /**
   * Mark the project as having unsaved changes
   */
  markDirty: () => void;

  /**
   * Mark the project as saved (no unsaved changes)
   * @param savedAt - The save timestamp
   */
  markClean: (savedAt?: Date) => void;

  /**
   * Add a project to the recent projects list
   * @param project - The recent project entry
   */
  addRecentProject: (project: RecentProject) => void;

  /**
   * Remove a project from the recent projects list
   * @param path - The project path to remove
   */
  removeRecentProject: (path: string) => void;

  /**
   * Clear all recent projects
   */
  clearRecentProjects: () => void;

  /**
   * Create a new empty project
   */
  newProject: () => void;

  /**
   * Get the project title for display (includes dirty indicator)
   */
  getDisplayTitle: () => string;
}

/**
 * Combined project store type
 */
export type ProjectStore = ProjectState & ProjectActions;

/**
 * Default project metadata
 */
const defaultMetadata: ProjectMetadata = {
  name: 'Untitled World',
  path: null,
  lastSaved: null,
  description: '',
  author: '',
};

/**
 * Initial state for the project store
 */
const initialState: ProjectState = {
  metadata: { ...defaultMetadata },
  isNew: true,
  isDirty: false,
  recentProjects: [],
};

/**
 * Maximum number of recent projects to keep
 */
const MAX_RECENT_PROJECTS = 10;

/**
 * Project store instance
 */
export const useProjectStore = create<ProjectStore>((set, get) => ({
  // State
  ...initialState,

  // Actions
  setProject: (metadata, isNew = false) =>
    set({
      metadata,
      isNew,
      isDirty: false,
    }),

  updateMetadata: (updates) =>
    set((state) => ({
      metadata: {
        ...state.metadata,
        ...updates,
      },
      isDirty: true,
    })),

  markDirty: () => set({ isDirty: true }),

  markClean: (savedAt) =>
    set((state) => ({
      isDirty: false,
      isNew: false,
      metadata: {
        ...state.metadata,
        lastSaved: savedAt ?? new Date(),
      },
    })),

  addRecentProject: (project) =>
    set((state) => {
      // Remove existing entry with same path if it exists
      const filtered = state.recentProjects.filter((p) => p.path !== project.path);

      // Add to front of list
      const updated = [project, ...filtered];

      // Trim to max size
      return {
        recentProjects: updated.slice(0, MAX_RECENT_PROJECTS),
      };
    }),

  removeRecentProject: (path) =>
    set((state) => ({
      recentProjects: state.recentProjects.filter((p) => p.path !== path),
    })),

  clearRecentProjects: () => set({ recentProjects: [] }),

  newProject: () =>
    set({
      metadata: { ...defaultMetadata },
      isNew: true,
      isDirty: false,
    }),

  getDisplayTitle: () => {
    const state = get();
    const title = state.metadata.name || 'Untitled World';
    return state.isDirty ? `${title} *` : title;
  },
}));

/**
 * Selector: Check if project has been saved before
 */
export const selectHasBeenSaved = (state: ProjectState): boolean =>
  state.metadata.path !== null;

/**
 * Selector: Check if project needs save prompt
 */
export const selectNeedsSavePrompt = (state: ProjectState): boolean =>
  state.isDirty || state.isNew;

/**
 * Selector: Get project file name from path
 */
export const selectFileName = (state: ProjectState): string | null => {
  if (!state.metadata.path) return null;
  const parts = state.metadata.path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
};
