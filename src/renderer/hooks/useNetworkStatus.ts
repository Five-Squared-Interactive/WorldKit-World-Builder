/**
 * useNetworkStatus Hook
 *
 * Subscribes to network status changes from the main process
 * and updates the UI store accordingly.
 */

import { useEffect } from 'react';
import { useUIStore } from '../stores';

/**
 * Hook to manage network status subscription
 * Should be used once at the app root level
 */
export function useNetworkStatus(): void {
  const setOnline = useUIStore((state) => state.setOnline);

  useEffect(() => {
    // Check if worldkit API is available
    if (!window.worldkit?.network) {
      console.warn('[useNetworkStatus] Network API not available');
      return;
    }

    // Get initial network status
    window.worldkit.network.getStatus().then((status) => {
      setOnline(status.online);
    }).catch((err) => {
      console.error('[useNetworkStatus] Failed to get initial status:', err);
    });

    // Subscribe to network status changes
    const cleanup = window.worldkit.network.onStatusChange((status) => {
      console.log('[useNetworkStatus] Network status changed:', status.online ? 'online' : 'offline');
      setOnline(status.online);
    });

    // Cleanup on unmount
    return cleanup;
  }, [setOnline]);
}

export default useNetworkStatus;
