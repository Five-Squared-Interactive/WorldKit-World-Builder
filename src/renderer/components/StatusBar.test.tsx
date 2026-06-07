import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useUIStore } from '../stores';

describe('StatusBar', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUIStore.setState({
      statusMessage: null,
      previewStatus: { state: 'idle' },
    });
  });

  describe('rendering', () => {
    it('should render with "Ready" when there is no message', () => {
      render(<StatusBar />);
      expect(screen.getByTestId('status-bar')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should render when there is a status message', () => {
      useUIStore.setState({ statusMessage: 'Test message' });

      render(<StatusBar />);

      expect(screen.getByTestId('status-bar')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  describe('preview status messages', () => {
    it('should show "Preparing preview..." when status is preparing', () => {
      useUIStore.setState({ previewStatus: { state: 'preparing' } });

      render(<StatusBar />);

      expect(screen.getByText('Preparing preview...')).toBeInTheDocument();
      expect(screen.getByText('◌')).toBeInTheDocument();
    });

    it('should show "Launching preview in WebVerse..." when status is launching', () => {
      useUIStore.setState({ previewStatus: { state: 'launching' } });

      render(<StatusBar />);

      expect(screen.getByText('Launching preview in WebVerse...')).toBeInTheDocument();
      expect(screen.getByText('◌')).toBeInTheDocument();
    });

    it('should show "Preview running in WebVerse" when status is running', () => {
      useUIStore.setState({ previewStatus: { state: 'running' } });

      render(<StatusBar />);

      expect(screen.getByText('Preview running in WebVerse')).toBeInTheDocument();
      expect(screen.queryByText('◌')).not.toBeInTheDocument();
    });

    it('should show error message when status is error', () => {
      useUIStore.setState({
        previewStatus: { state: 'error', error: 'WebVerse not found' },
      });

      render(<StatusBar />);

      expect(screen.getByText('Preview error: WebVerse not found')).toBeInTheDocument();
    });

    it('should show "Ready" for idle status with no message', () => {
      useUIStore.setState({ previewStatus: { state: 'idle' } });

      render(<StatusBar />);

      expect(screen.getByTestId('status-bar')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });
  });

  describe('priority', () => {
    it('should show preview status over status message when preparing', () => {
      useUIStore.setState({
        statusMessage: 'Some other message',
        previewStatus: { state: 'preparing' },
      });

      render(<StatusBar />);

      expect(screen.getByText('Preparing preview...')).toBeInTheDocument();
      expect(screen.queryByText('Some other message')).not.toBeInTheDocument();
    });
  });
});
