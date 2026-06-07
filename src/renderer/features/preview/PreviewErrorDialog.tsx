/**
 * PreviewErrorDialog Component
 *
 * Displays error information when preview launch fails.
 * Includes troubleshooting tips to help users resolve common issues.
 */

import styles from './PreviewErrorDialog.module.css';

interface PreviewErrorDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The error message */
  error: string;
  /** Callback when dialog is closed */
  onClose: () => void;
}

/**
 * Troubleshooting tips for common preview errors
 */
const troubleshootingTips = [
  'Make sure WebVerse is installed and the path is correct',
  'Check that WebVerse is not already running with another file',
  'Try closing and reopening WebVerse',
  'Verify your scene has valid content to preview',
  'Check if your antivirus is blocking the application',
  'Try running WorldKit as administrator',
];

/**
 * Dialog shown when preview launch fails
 */
export function PreviewErrorDialog({
  isOpen,
  error,
  onClose,
}: PreviewErrorDialogProps) {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="preview-error-dialog"
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Preview Launch Failed</h2>
        </div>

        <div className={styles.content}>
          <div className={styles.errorBox}>
            <span className={styles.errorIcon}>⚠️</span>
            <p className={styles.errorMessage}>{error}</p>
          </div>

          <div className={styles.troubleshootingSection}>
            <h3 className={styles.troubleshootingTitle}>Troubleshooting Tips</h3>
            <ul className={styles.tipsList}>
              {troubleshootingTips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>

          <p className={styles.helpText}>
            If the problem persists, try restarting both WorldKit and WebVerse.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={onClose}
            data-testid="close-preview-error"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreviewErrorDialog;
