/**
 * Auto-Save Hook
 *
 * Automatically saves the project at regular intervals when there are unsaved changes.
 * Uses a timer to trigger auto-save silently in the background.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { serializeToVeml, getReferencedModelFiles } from '../../services/veml-serializer';

/** Default auto-save interval (2 minutes) */
const DEFAULT_AUTOSAVE_INTERVAL = 2 * 60 * 1000;

interface UseAutoSaveOptions {
  /** Whether auto-save is enabled */
  enabled?: boolean;
  /** Auto-save interval in milliseconds */
  interval?: number;
}

interface UseAutoSaveResult {
  /** Whether auto-save is enabled */
  isEnabled: boolean;
  /** Last auto-save timestamp (ISO string) */
  lastAutoSave: string | null;
  /** Whether an auto-save is currently in progress */
  isSaving: boolean;
  /** Toggle auto-save on/off */
  setEnabled: (enabled: boolean) => void;
}

/**
 * Hook to manage auto-save functionality
 */
export function useAutoSave(options: UseAutoSaveOptions = {}): UseAutoSaveResult {
  const { enabled = true, interval = DEFAULT_AUTOSAVE_INTERVAL } = options;

  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isDirty = useProjectStore((state) => state.isDirty);
  const projectName = useProjectStore((state) => state.metadata.name);
  const entities = useSceneStore((state) => state.entities);
  const rootIds = useSceneStore((state) => state.rootIds);

  /**
   * Perform auto-save
   */
  const performAutoSave = useCallback(async () => {
    if (!isDirty || isSaving) {
      return;
    }

    if (!window.worldkit?.project?.autoSave) {
      return;
    }

    setIsSaving(true);

    try {
      // Serialize scene to VEML
      const vemlContent = serializeToVeml(entities, rootIds, {
        name: projectName,
      });

      // Get referenced model files
      const modelFiles = getReferencedModelFiles(entities);

      // Perform auto-save via IPC
      const result = await window.worldkit.project.autoSave({
        vemlContent,
        modelFiles,
      });

      if (result.success && result.timestamp) {
        setLastAutoSave(result.timestamp);
        console.log('[auto-save] Saved at', result.timestamp);
      }
    } catch (error) {
      console.error('[auto-save] Failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, isSaving, entities, rootIds, projectName]);

  /**
   * Start/restart the auto-save timer
   */
  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Don't start timer if disabled
    if (!isEnabled) {
      return;
    }

    // Start new timer
    timerRef.current = setInterval(() => {
      performAutoSave();
    }, interval);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isEnabled, interval, performAutoSave]);

  /**
   * Load enabled preference from storage
   */
  useEffect(() => {
    if (!window.worldkit?.preferences?.getAll) {
      return;
    }

    window.worldkit.preferences.getAll().then((prefs) => {
      setIsEnabled(prefs.autoSaveEnabled);
    });
  }, []);

  /**
   * Save enabled preference when changed
   */
  const handleSetEnabled = useCallback((newEnabled: boolean) => {
    setIsEnabled(newEnabled);

    if (window.worldkit?.preferences?.set) {
      window.worldkit.preferences.set('autoSaveEnabled', newEnabled);
    }
  }, []);

  return {
    isEnabled,
    lastAutoSave,
    isSaving,
    setEnabled: handleSetEnabled,
  };
}
