/**
 * Recovery Dialog Component
 *
 * Shows when auto-save data is available from a previous session.
 * Allows user to recover or discard the auto-saved work.
 */

import { useState, useCallback, useEffect } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useCommandStore } from '../../stores/commandStore';
import { parseVeml } from '../../services/veml-parser';
import styles from './RecoveryDialog.module.css';

interface RecoveryDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Auto-save timestamp */
  autoSaveTime?: string;
  /** Callback when dialog is closed */
  onClose: () => void;
}

/**
 * Format date for display
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

/**
 * RecoveryDialog - Modal for recovering from auto-save
 */
export function RecoveryDialog({
  isOpen,
  autoSaveTime,
  onClose,
}: RecoveryDialogProps): JSX.Element | null {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearScene = useSceneStore((state) => state.clearScene);
  const addEntity = useSceneStore((state) => state.addEntity);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const clearCommands = useCommandStore((state) => state.clear);
  const setProject = useProjectStore((state) => state.setProject);
  const markDirty = useProjectStore((state) => state.markDirty);

  const handleRecover = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.worldkit.project.recover();

      if (!result.success || !result.vemlContent) {
        setError(result.error || 'Failed to recover');
        setLoading(false);
        return;
      }

      // Parse the VEML content
      const parseResult = parseVeml(result.vemlContent);

      if (!parseResult.success || !parseResult.entities) {
        setError(parseResult.error || 'Failed to parse recovered data');
        setLoading(false);
        return;
      }

      // Clear existing scene
      clearScene();
      clearSelection();
      clearCommands();

      // Add entities from recovered VEML
      const addedIds = new Set<string>();

      // First pass: add root entities
      for (const entity of parseResult.entities) {
        if (!entity.parentId) {
          addEntity(entity);
          addedIds.add(entity.id);
        }
      }

      // Second pass: add child entities
      for (const entity of parseResult.entities) {
        if (entity.parentId && !addedIds.has(entity.id)) {
          addEntity(entity, entity.parentId);
          addedIds.add(entity.id);
        }
      }

      // Set project metadata (recovered state is unsaved)
      setProject(
        {
          name: parseResult.metadata?.name || 'Recovered World',
          path: null,
          lastSaved: null,
        },
        true
      );

      // Mark as dirty since this is recovered data
      markDirty();

      // Update window title
      await window.worldkit.window.setTitle(
        `World Builder - ${parseResult.metadata?.name || 'Recovered World'} *`
      );

      // Discard the auto-save data now that we've recovered
      await window.worldkit.project.discardRecovery();

      console.log('[recovery] Successfully recovered from auto-save');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recover');
    } finally {
      setLoading(false);
    }
  }, [
    clearScene,
    clearSelection,
    clearCommands,
    addEntity,
    setProject,
    markDirty,
    onClose,
  ]);

  const handleDiscard = useCallback(async () => {
    setLoading(true);

    try {
      await window.worldkit.project.discardRecovery();
      console.log('[recovery] Discarded auto-save data');
      onClose();
    } catch (err) {
      console.error('[recovery] Failed to discard:', err);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" data-testid="recovery-dialog-overlay">
      <div className={styles.dialog} data-testid="recovery-dialog">
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"
              fill="currentColor"
            />
          </svg>
        </div>

        <h2 className={styles.title}>Recover Unsaved Work?</h2>

        <p className={styles.message}>
          WorldKit found unsaved work from a previous session.
          {autoSaveTime && (
            <span className={styles.timestamp}>
              Last auto-saved: {formatDateTime(autoSaveTime)}
            </span>
          )}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            className={styles.discardButton}
            onClick={handleDiscard}
            disabled={loading}
            data-testid="recovery-discard"
          >
            {loading ? 'Discarding...' : 'Discard'}
          </button>
          <button
            className={styles.recoverButton}
            onClick={handleRecover}
            disabled={loading}
            data-testid="recovery-recover"
          >
            {loading ? 'Recovering...' : 'Recover'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecoveryDialog;
