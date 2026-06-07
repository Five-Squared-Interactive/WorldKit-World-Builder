/**
 * StatusBar Component
 *
 * Displays status messages at the bottom of the editor.
 * Shows messages for operations like preview launching, file saving, etc.
 */

import { useUIStore } from '../stores';

/**
 * Status bar component
 */
export function StatusBar() {
  const statusMessage = useUIStore((state) => state.statusMessage);
  const previewStatus = useUIStore((state) => state.previewStatus);

  // Determine message to display
  let message = statusMessage;
  let isAnimating = false;

  if (previewStatus.state === 'preparing') {
    message = 'Preparing preview...';
    isAnimating = true;
  } else if (previewStatus.state === 'launching') {
    message = 'Launching preview in WebVerse...';
    isAnimating = true;
  } else if (previewStatus.state === 'running') {
    message = 'Preview running in WebVerse';
    isAnimating = false;
  } else if (previewStatus.state === 'error' && previewStatus.error) {
    message = `Preview error: ${previewStatus.error}`;
    isAnimating = false;
  }

  return (
    <div className="status-bar" data-testid="status-bar">
      {isAnimating && <span className="status-spinner">◌</span>}
      <span className="status-message">{message || 'Ready'}</span>
    </div>
  );
}

export default StatusBar;
