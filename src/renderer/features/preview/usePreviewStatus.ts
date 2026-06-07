/**
 * usePreviewStatus Hook
 *
 * Subscribes to preview status changes from the main process
 * and updates the UI store accordingly.
 */

import { useEffect } from 'react';
import { useUIStore } from '../../stores';
import type { PreviewStatus } from '../../../shared/types/ipc';

/**
 * Hook to subscribe to preview status changes
 */
export function usePreviewStatus(): void {
  const setPreviewStatus = useUIStore((state) => state.setPreviewStatus);

  useEffect(() => {
    if (!window.worldkit?.preview?.onStatusChange) {
      return;
    }

    const handleStatusChange = (status: PreviewStatus) => {
      setPreviewStatus(status);
    };

    const cleanup = window.worldkit.preview.onStatusChange(handleStatusChange);

    return () => {
      cleanup();
    };
  }, [setPreviewStatus]);
}

export default usePreviewStatus;
