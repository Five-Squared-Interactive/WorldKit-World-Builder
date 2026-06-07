/**
 * WebVerse Not Found Dialog
 *
 * Informative dialog shown when the user tries to preview
 * but WebVerse is not installed on their system.
 */

import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import styles from './WebVerseNotFoundDialog.module.css';

const WEBVERSE_DOWNLOAD_URL = 'https://webverse.world/download';

interface WebVerseNotFoundDialogProps {
  onClose: () => void;
  onBrowse: () => void;
}

export function WebVerseNotFoundDialog({
  onClose,
  onBrowse,
}: WebVerseNotFoundDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    // Open download page in default browser
    window.open(WEBVERSE_DOWNLOAD_URL, '_blank');
    // Close dialog after brief delay
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleBrowse = () => {
    onBrowse();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="webverse-not-found-dialog"
    >
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>WebVerse Not Found</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.icon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>

          <p className={styles.description}>
            WebVerse is required to preview your worlds in real-time.
            It&apos;s a free application that lets you experience your creations
            in immersive 3D.
          </p>

          <p className={styles.subdescription}>
            Download WebVerse or browse to an existing installation.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? 'Opening...' : 'Download WebVerse'}
          </button>

          <button className={styles.secondaryButton} onClick={handleBrowse}>
            Browse...
          </button>

          <button className={styles.textButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage WebVerse Not Found Dialog visibility
 */
export function useWebVerseNotFoundDialog() {
  const webverseStatus = useUIStore((state) => state.webverseStatus);
  const [isOpen, setIsOpen] = useState(false);

  const showDialog = () => setIsOpen(true);
  const hideDialog = () => setIsOpen(false);

  // Only show dialog if WebVerse is not installed
  const shouldShowDialog = !webverseStatus.installed && isOpen;

  return {
    isOpen: shouldShowDialog,
    showDialog,
    hideDialog,
  };
}
