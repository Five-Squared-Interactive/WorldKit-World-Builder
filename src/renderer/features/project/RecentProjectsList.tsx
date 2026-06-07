/**
 * Recent Projects List Component
 *
 * Displays a list of recently opened projects with options to open or remove.
 */

import { useCallback, useState } from 'react';
import { useRecentProjects } from './useRecentProjects';
import type { RecentProject } from '../../../shared/types/ipc';
import styles from './RecentProjectsList.module.css';

interface RecentProjectsListProps {
  /** Callback when a project is selected */
  onProjectSelect: (project: RecentProject) => void;
}

/**
 * Format date for display
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Shorten path for display
 */
function shortenPath(path: string, maxLength = 50): string {
  if (path.length <= maxLength) {
    return path;
  }
  const parts = path.replace(/\\/g, '/').split('/');
  if (parts.length <= 3) {
    return path;
  }
  return `${parts[0]}/.../${parts.slice(-2).join('/')}`;
}

/**
 * RecentProjectsList - Displays recent projects with actions
 */
export function RecentProjectsList({ onProjectSelect }: RecentProjectsListProps): JSX.Element {
  const { projects, isLoading, error, remove } = useRecentProjects();
  const [contextMenuTarget, setContextMenuTarget] = useState<string | null>(null);

  const handleProjectClick = useCallback(
    (project: RecentProject) => {
      if (project.exists !== false) {
        onProjectSelect(project);
      }
    },
    [onProjectSelect]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.preventDefault();
      setContextMenuTarget(path);
    },
    []
  );

  const handleRemove = useCallback(
    async (path: string) => {
      await remove(path);
      setContextMenuTarget(null);
    },
    [remove]
  );

  const handleOverlayClick = useCallback(() => {
    setContextMenuTarget(null);
  }, []);

  if (isLoading) {
    return <div className={styles.loading} data-testid="recent-projects-loading">Loading recent projects...</div>;
  }

  if (error) {
    return <div className={styles.error} data-testid="recent-projects-error">{error}</div>;
  }

  if (projects.length === 0) {
    return (
      <div className={styles.empty} data-testid="recent-projects-empty">
        <p>No recent projects</p>
        <p className={styles.emptyHint}>Projects you open will appear here</p>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="recent-projects-list">
      {contextMenuTarget && (
        <div className={styles.contextOverlay} onClick={handleOverlayClick} data-testid="recent-projects-overlay" />
      )}
      <ul className={styles.list}>
        {projects.map((project, index) => (
          <li
            key={project.path}
            className={`${styles.item} ${project.exists === false ? styles.missing : ''}`}
            onClick={() => handleProjectClick(project)}
            onContextMenu={(e) => handleContextMenu(e, project.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleProjectClick(project);
              }
            }}
            data-testid={`recent-project-${index}`}
          >
            <div className={styles.icon}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path
                  d="M3 7V5C3 4.44772 3.44772 4 4 4H9L11 6H20C20.5523 6 21 6.44772 21 7V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{project.name}</span>
              <span className={styles.path} title={project.path}>
                {shortenPath(project.path)}
              </span>
            </div>
            <div className={styles.meta}>
              {project.exists === false ? (
                <span className={styles.missingBadge}>Missing</span>
              ) : (
                <span className={styles.date}>{formatDate(project.lastOpened)}</span>
              )}
            </div>
            {contextMenuTarget === project.path && (
              <div className={styles.contextMenu} data-testid="recent-project-context-menu">
                <button
                  className={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(project.path);
                  }}
                  data-testid="recent-project-remove"
                >
                  Remove from list
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentProjectsList;
