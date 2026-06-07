/**
 * OfflineIndicator Component
 *
 * Displays a visual indicator when the application is offline.
 * Shows tooltip with information about available functionality.
 */

import { useUIStore } from '../stores';

/**
 * Offline indicator component that appears when network is unavailable
 */
export function OfflineIndicator() {
  const isOnline = useUIStore((state) => state.isOnline);

  // Don't render anything when online
  if (isOnline) {
    return null;
  }

  return (
    <div
      className="offline-indicator"
      data-testid="offline-indicator"
      title="You are offline. Core features (create, edit, save, export) work normally. Online features like asset browsing from WorldHub are unavailable."
    >
      <span className="offline-icon" aria-hidden="true">
        ◯
      </span>
      <span className="offline-text">Offline</span>
    </div>
  );
}

export default OfflineIndicator;
