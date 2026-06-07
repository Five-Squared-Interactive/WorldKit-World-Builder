/**
 * OfflineIndicator Component Tests
 *
 * Tests for the offline indicator component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';
import { useUIStore } from '../stores';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    // Reset store to default state (online)
    useUIStore.getState().resetUI();
  });

  describe('when online', () => {
    it('should not render anything', () => {
      useUIStore.getState().setOnline(true);

      const { container } = render(<OfflineIndicator />);

      expect(container.firstChild).toBeNull();
    });

    it('should not have offline-indicator in the DOM', () => {
      useUIStore.getState().setOnline(true);

      render(<OfflineIndicator />);

      expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
    });
  });

  describe('when offline', () => {
    beforeEach(() => {
      useUIStore.getState().setOnline(false);
    });

    it('should render the offline indicator', () => {
      render(<OfflineIndicator />);

      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    });

    it('should display "Offline" text', () => {
      render(<OfflineIndicator />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should have a tooltip explaining offline state', () => {
      render(<OfflineIndicator />);

      const indicator = screen.getByTestId('offline-indicator');
      expect(indicator).toHaveAttribute('title');
      expect(indicator.getAttribute('title')).toContain('offline');
      expect(indicator.getAttribute('title')).toContain('Core features');
    });

    it('should have the correct CSS class', () => {
      render(<OfflineIndicator />);

      const indicator = screen.getByTestId('offline-indicator');
      expect(indicator).toHaveClass('offline-indicator');
    });
  });

  describe('state transitions', () => {
    it('should appear when going offline', () => {
      useUIStore.getState().setOnline(true);

      const { rerender } = render(<OfflineIndicator />);
      expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();

      // Go offline
      useUIStore.getState().setOnline(false);
      rerender(<OfflineIndicator />);

      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    });

    it('should disappear when going online', () => {
      useUIStore.getState().setOnline(false);

      const { rerender } = render(<OfflineIndicator />);
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();

      // Go online
      useUIStore.getState().setOnline(true);
      rerender(<OfflineIndicator />);

      expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
    });
  });
});
