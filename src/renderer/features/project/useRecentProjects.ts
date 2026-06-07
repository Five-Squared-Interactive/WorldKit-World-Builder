/**
 * Recent Projects Hook
 *
 * Manages the list of recently opened projects.
 */

import { useCallback, useState, useEffect } from 'react';
import type { RecentProject } from '../../../shared/types/ipc';

interface UseRecentProjectsResult {
  /** List of recent projects */
  projects: RecentProject[];
  /** Whether projects are loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh the recent projects list */
  refresh: () => Promise<void>;
  /** Remove a project from the list */
  remove: (path: string) => Promise<void>;
  /** Clear all recent projects */
  clear: () => Promise<void>;
}

/**
 * Hook to manage recent projects
 */
export function useRecentProjects(): UseRecentProjectsResult {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load recent projects from main process
   */
  const refresh = useCallback(async () => {
    if (!window.worldkit?.project?.getRecent) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.worldkit.project.getRecent();
      if (result.success) {
        setProjects(result.projects);
      } else {
        setError(result.error || 'Failed to load recent projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove a project from the list
   */
  const remove = useCallback(async (path: string) => {
    if (!window.worldkit?.project?.removeRecent) {
      return;
    }

    try {
      await window.worldkit.project.removeRecent(path);
      // List will be updated via onRecentUpdated listener
    } catch (err) {
      console.error('[recent-projects] Failed to remove:', err);
    }
  }, []);

  /**
   * Clear all recent projects
   */
  const clear = useCallback(async () => {
    if (!window.worldkit?.project?.clearRecent) {
      return;
    }

    try {
      await window.worldkit.project.clearRecent();
      // List will be updated via onRecentUpdated listener
    } catch (err) {
      console.error('[recent-projects] Failed to clear:', err);
    }
  }, []);

  /**
   * Initial load and listen for updates
   */
  useEffect(() => {
    refresh();

    // Listen for updates from main process
    if (!window.worldkit?.project?.onRecentUpdated) {
      return;
    }

    const cleanup = window.worldkit.project.onRecentUpdated((updated) => {
      setProjects(updated);
    });

    return cleanup;
  }, [refresh]);

  return {
    projects,
    isLoading,
    error,
    refresh,
    remove,
    clear,
  };
}
