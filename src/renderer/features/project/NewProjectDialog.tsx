/**
 * New Project Dialog Component
 *
 * Modal dialog for creating a new world project.
 * Shows template gallery and recent projects.
 */

import { useState, useCallback, useEffect } from 'react';
import { TemplateGallery } from './TemplateGallery';
import { RecentProjectsList } from './RecentProjectsList';
import { parseVeml } from '../../services/veml-parser';
import type { TemplateInfo } from '../../../shared/types/template';
import type { RecentProject } from '../../../shared/types/ipc';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useCommandStore } from '../../stores/commandStore';
import styles from './NewProjectDialog.module.css';

type DialogTab = 'new' | 'recent';

interface NewProjectDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when project is created */
  onProjectCreated?: () => void;
}

/**
 * NewProjectDialog - Modal for creating a new project from a template
 */
export function NewProjectDialog({
  isOpen,
  onClose,
  onProjectCreated,
}: NewProjectDialogProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<DialogTab>('new');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearScene = useSceneStore((state) => state.clearScene);
  const addEntity = useSceneStore((state) => state.addEntity);
  const newProject = useProjectStore((state) => state.newProject);
  const setProject = useProjectStore((state) => state.setProject);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const clearCommands = useCommandStore((state) => state.clear);

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    setError(null);

    try {
      // Load the template data
      const result = await window.worldkit.template.loadTemplate(selectedTemplate.id);

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to load template');
        setLoading(false);
        return;
      }

      // Clear existing scene
      clearScene();
      clearSelection();
      clearCommands();

      // Reset project metadata
      newProject();

      // Set project name based on template
      setProject(
        {
          name: result.data.suggestedName,
          path: null,
          lastSaved: null,
        },
        true
      );

      // Add template entities to scene
      for (const entity of result.data.entities) {
        addEntity(entity);
      }

      // Update window title
      await window.worldkit.window.setTitle(`World Builder - ${result.data.suggestedName}`);

      // Close dialog and notify
      onClose();
      onProjectCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }, [
    selectedTemplate,
    clearScene,
    clearSelection,
    clearCommands,
    newProject,
    setProject,
    addEntity,
    onClose,
    onProjectCreated,
  ]);

  const handleOpenRecent = useCallback(
    async (project: RecentProject) => {
      setLoading(true);
      setError(null);

      try {
        // Open the project by path
        const result = await window.worldkit.project.openPath(project.path);

        if (!result.success || !result.vemlContent) {
          setError(result.error || 'Failed to open project');
          setLoading(false);
          return;
        }

        // Parse VEML content
        const parseResult = parseVeml(result.vemlContent, result.path);

        if (!parseResult.success || !parseResult.entities) {
          setError(parseResult.error || 'Failed to parse project file');
          setLoading(false);
          return;
        }

        // Clear existing scene
        clearScene();
        clearSelection();
        clearCommands();

        // Add entities from parsed VEML
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

        // Set project metadata
        setProject(
          {
            name: result.name || parseResult.metadata?.name || 'Untitled World',
            path: result.path || null,
            lastSaved: new Date(),
            description: parseResult.metadata?.description || '',
            author: parseResult.metadata?.author || '',
          },
          false
        );

        // Update window title
        const title = `World Builder - ${result.name || parseResult.metadata?.name || 'Untitled World'}`;
        await window.worldkit.window.setTitle(title);

        // Close dialog and notify
        onClose();
        onProjectCreated?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open project');
      } finally {
        setLoading(false);
      }
    },
    [clearScene, clearSelection, clearCommands, addEntity, setProject, onClose, onProjectCreated]
  );

  const handleClose = useCallback(() => {
    if (!loading) {
      setActiveTab('new');
      setSelectedTemplate(null);
      setError(null);
      onClose();
    }
  }, [loading, onClose]);

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true" data-testid="new-project-dialog-overlay">
      <div className={styles.dialog} data-testid="new-project-dialog">
        <header className={styles.header}>
          <h2 className={styles.title} data-testid="new-project-dialog-title">
            {activeTab === 'new' ? 'New Project' : 'Recent Projects'}
          </h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={loading}
            aria-label="Close"
            data-testid="new-project-dialog-close"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <nav className={styles.tabs} data-testid="new-project-dialog-tabs">
          <button
            className={`${styles.tab} ${activeTab === 'new' ? `${styles.tabActive} tabActive` : ''}`}
            onClick={() => setActiveTab('new')}
            disabled={loading}
            data-testid="new-project-tab-new"
          >
            New Project
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'recent' ? `${styles.tabActive} tabActive` : ''}`}
            onClick={() => setActiveTab('recent')}
            disabled={loading}
            data-testid="new-project-tab-recent"
          >
            Recent Projects
          </button>
        </nav>

        <div className={styles.content}>
          {activeTab === 'new' ? (
            <>
              <p className={styles.subtitle}>Choose a template to get started:</p>
              <TemplateGallery
                selectedId={selectedTemplate?.id ?? null}
                onSelect={setSelectedTemplate}
              />
            </>
          ) : (
            <RecentProjectsList onProjectSelect={handleOpenRecent} />
          )}
          {error && <div className={styles.error}>{error}</div>}
        </div>

        <footer className={styles.footer}>
          <button className={styles.cancelButton} onClick={handleClose} disabled={loading} data-testid="new-project-cancel">
            Cancel
          </button>
          {activeTab === 'new' && (
            <button
              className={styles.createButton}
              onClick={handleCreate}
              disabled={!selectedTemplate || loading}
              data-testid="new-project-create"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default NewProjectDialog;
