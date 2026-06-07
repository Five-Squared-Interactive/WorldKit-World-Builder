/**
 * WebVerse Not Found Dialog Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  WebVerseNotFoundDialog,
  useWebVerseNotFoundDialog,
} from './WebVerseNotFoundDialog';
import { useUIStore } from '../../stores/uiStore';
import { renderHook, act } from '@testing-library/react';

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

describe('WebVerseNotFoundDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnBrowse = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the dialog with correct title', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    expect(screen.getByText('WebVerse Not Found')).toBeInTheDocument();
  });

  it('renders dialog description text', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    expect(
      screen.getByText(/WebVerse is required to preview your worlds/)
    ).toBeInTheDocument();
  });

  it('renders Download WebVerse button', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    expect(
      screen.getByRole('button', { name: /download webverse/i })
    ).toBeInTheDocument();
  });

  it('renders Browse button', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button (X) is clicked', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onBrowse when Browse button is clicked', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    fireEvent.click(screen.getByRole('button', { name: /browse/i }));
    expect(mockOnBrowse).toHaveBeenCalledTimes(1);
  });

  it('opens download URL when Download button is clicked', async () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /download webverse/i })
    );

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://webverse.world/download',
      '_blank'
    );
  });

  it('closes dialog after clicking Download button', async () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /download webverse/i })
    );

    // Fast-forward timer
    vi.advanceTimersByTime(500);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking backdrop', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    fireEvent.click(screen.getByTestId('webverse-not-found-dialog'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside dialog', () => {
    render(
      <WebVerseNotFoundDialog onClose={mockOnClose} onBrowse={mockOnBrowse} />
    );

    // Click on the dialog content, not the backdrop
    fireEvent.click(screen.getByText('WebVerse Not Found'));
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});

describe('useWebVerseNotFoundDialog', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  it('returns isOpen as false initially', () => {
    const { result } = renderHook(() => useWebVerseNotFoundDialog());
    expect(result.current.isOpen).toBe(false);
  });

  it('returns isOpen as true after showDialog is called (when WebVerse not installed)', () => {
    // Ensure WebVerse is not installed
    useUIStore.getState().setWebVerseStatus({ installed: false });

    const { result } = renderHook(() => useWebVerseNotFoundDialog());

    act(() => {
      result.current.showDialog();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('returns isOpen as false when WebVerse is installed even after showDialog', () => {
    // Set WebVerse as installed
    useUIStore.getState().setWebVerseStatus({
      installed: true,
      path: '/path/to/webverse',
    });

    const { result } = renderHook(() => useWebVerseNotFoundDialog());

    act(() => {
      result.current.showDialog();
    });

    // Should still be false because WebVerse is installed
    expect(result.current.isOpen).toBe(false);
  });

  it('hides dialog when hideDialog is called', () => {
    useUIStore.getState().setWebVerseStatus({ installed: false });

    const { result } = renderHook(() => useWebVerseNotFoundDialog());

    act(() => {
      result.current.showDialog();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.hideDialog();
    });

    expect(result.current.isOpen).toBe(false);
  });
});
