import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewErrorDialog } from './PreviewErrorDialog';

describe('PreviewErrorDialog', () => {
  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <PreviewErrorDialog
          isOpen={false}
          error="Test error"
          onClose={() => {}}
        />
      );

      expect(screen.queryByTestId('preview-error-dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <PreviewErrorDialog
          isOpen={true}
          error="Test error"
          onClose={() => {}}
        />
      );

      expect(screen.getByTestId('preview-error-dialog')).toBeInTheDocument();
    });

    it('should display the error message', () => {
      render(
        <PreviewErrorDialog
          isOpen={true}
          error="Failed to launch WebVerse"
          onClose={() => {}}
        />
      );

      expect(screen.getByText('Failed to launch WebVerse')).toBeInTheDocument();
    });

    it('should display the title', () => {
      render(
        <PreviewErrorDialog
          isOpen={true}
          error="Test error"
          onClose={() => {}}
        />
      );

      expect(screen.getByText('Preview Launch Failed')).toBeInTheDocument();
    });

    it('should display troubleshooting tips', () => {
      render(
        <PreviewErrorDialog
          isOpen={true}
          error="Test error"
          onClose={() => {}}
        />
      );

      expect(screen.getByText('Troubleshooting Tips')).toBeInTheDocument();
      expect(
        screen.getByText('Make sure WebVerse is installed and the path is correct')
      ).toBeInTheDocument();
    });

    it('should display help text', () => {
      render(
        <PreviewErrorDialog
          isOpen={true}
          error="Test error"
          onClose={() => {}}
        />
      );

      expect(
        screen.getByText('If the problem persists, try restarting both WorldKit and WebVerse.')
      ).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <PreviewErrorDialog
          isOpen={true}
          error="Test error"
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByTestId('close-preview-error'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(
        <PreviewErrorDialog
          isOpen={true}
          error="Test error"
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByTestId('preview-error-dialog'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when dialog content is clicked', () => {
      const onClose = vi.fn();
      render(
        <PreviewErrorDialog
          isOpen={true}
          error="Test error"
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByText('Preview Launch Failed'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
