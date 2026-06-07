/**
 * useWebVerseDetection Hook
 *
 * Detects WebVerse installation on app startup and keeps
 * the uiStore.webverseStatus updated.
 */

import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';

/**
 * Hook to detect WebVerse installation and update UI state
 * Should be called once in the root component
 */
export function useWebVerseDetection(): void {
  const setWebVerseStatus = useUIStore((state) => state.setWebVerseStatus);

  useEffect(() => {
    // Detect WebVerse on mount
    const detectWebVerse = async () => {
      try {
        const result = await window.worldkit.webverse.detect();
        setWebVerseStatus({
          installed: result.installed,
          path: result.path,
          type: result.type,
          version: result.version,
        });
      } catch (error) {
        console.error('Failed to detect WebVerse:', error);
        // Keep default (not installed) status on error
        setWebVerseStatus({ installed: false });
      }
    };

    detectWebVerse();
  }, [setWebVerseStatus]);
}
