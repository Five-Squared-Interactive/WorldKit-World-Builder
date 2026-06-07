/**
 * Template Gallery Component
 *
 * Displays available world templates in a grid with thumbnails.
 * Used in the New Project dialog.
 */

import { useState, useEffect } from 'react';
import type { TemplateInfo } from '../../../shared/types/template';
import styles from './TemplateGallery.module.css';

interface TemplateGalleryProps {
  /** Currently selected template ID */
  selectedId: string | null;
  /** Callback when a template is selected */
  onSelect: (template: TemplateInfo) => void;
}

/**
 * TemplateGallery - Grid of template cards for selection
 */
export function TemplateGallery({ selectedId, onSelect }: TemplateGalleryProps): JSX.Element {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const result = await window.worldkit.template.listTemplates();
        if (result.success && result.templates) {
          setTemplates(result.templates);
        } else {
          setError(result.error || 'Failed to load templates');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  if (loading) {
    return <div className={styles.loading} data-testid="template-loading">Loading templates...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.gallery} data-testid="template-gallery">
      {templates.map((template) => (
        <button
          key={template.id}
          className={`${styles.card} ${selectedId === template.id ? `${styles.selected} selected` : ''}`}
          onClick={() => onSelect(template)}
          type="button"
          data-testid={`template-card-${template.id}`}
        >
          <div className={styles.thumbnail}>
            <TemplateIcon templateId={template.id} />
          </div>
          <div className={styles.info}>
            <h3 className={styles.name}>{template.name}</h3>
            <p className={styles.description}>{template.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * TemplateIcon - SVG icon for each template type
 */
function TemplateIcon({ templateId }: { templateId: string }): JSX.Element {
  // Simple placeholder icons for each template type
  switch (templateId) {
    case 'empty':
      return (
        <svg viewBox="0 0 64 64" className={styles.icon}>
          <rect x="8" y="40" width="48" height="4" fill="currentColor" opacity="0.5" />
          <circle cx="32" cy="20" r="8" fill="currentColor" opacity="0.3" />
        </svg>
      );
    case 'room':
      return (
        <svg viewBox="0 0 64 64" className={styles.icon}>
          <rect x="8" y="48" width="48" height="4" fill="currentColor" opacity="0.6" />
          <path d="M8 48 L8 20 L32 8 L56 20 L56 48" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
          <rect x="24" y="32" width="16" height="16" fill="currentColor" opacity="0.4" />
        </svg>
      );
    case 'park':
      return (
        <svg viewBox="0 0 64 64" className={styles.icon}>
          <rect x="4" y="48" width="56" height="8" fill="currentColor" opacity="0.4" />
          <circle cx="20" cy="28" r="12" fill="currentColor" opacity="0.5" />
          <rect x="18" y="40" width="4" height="8" fill="currentColor" opacity="0.6" />
          <circle cx="48" cy="32" r="8" fill="currentColor" opacity="0.4" />
          <rect x="46" y="40" width="4" height="8" fill="currentColor" opacity="0.5" />
        </svg>
      );
    case 'gallery':
      return (
        <svg viewBox="0 0 64 64" className={styles.icon}>
          <rect x="8" y="48" width="48" height="4" fill="currentColor" opacity="0.6" />
          <rect x="8" y="12" width="48" height="36" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <rect x="16" y="20" width="12" height="10" fill="currentColor" opacity="0.5" />
          <rect x="36" y="20" width="12" height="10" fill="currentColor" opacity="0.5" />
          <rect x="20" y="38" width="8" height="10" fill="currentColor" opacity="0.4" />
          <rect x="36" y="38" width="8" height="10" fill="currentColor" opacity="0.4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className={styles.icon}>
          <rect x="16" y="16" width="32" height="32" fill="currentColor" opacity="0.3" />
        </svg>
      );
  }
}

export default TemplateGallery;
