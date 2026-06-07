/**
 * ContextMenu Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

describe('ContextMenu', () => {
  const mockOnClose = vi.fn();

  const defaultItems: ContextMenuItem[] = [
    { label: 'Cut', shortcut: 'Ctrl+X', action: vi.fn() },
    { label: 'Copy', shortcut: 'Ctrl+C', action: vi.fn() },
    { label: 'Paste', shortcut: 'Ctrl+V', action: vi.fn(), disabled: true },
    { type: 'divider' },
    { label: 'Delete', shortcut: 'Del', action: vi.fn() },
  ];

  beforeEach(() => {
    mockOnClose.mockClear();
    defaultItems.forEach((item) => {
      if (item.action) {
        (item.action as ReturnType<typeof vi.fn>).mockClear();
      }
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should render all menu items', () => {
    render(<ContextMenu position={{ x: 100, y: 100 }} items={defaultItems} onClose={mockOnClose} />);

    expect(screen.getByText('Cut')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Paste')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should display shortcuts', () => {
    render(<ContextMenu position={{ x: 100, y: 100 }} items={defaultItems} onClose={mockOnClose} />);

    expect(screen.getByText('Ctrl+X')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+C')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+V')).toBeInTheDocument();
  });

  it('should call action and close on item click', () => {
    render(<ContextMenu position={{ x: 100, y: 100 }} items={defaultItems} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('Cut'));

    expect(defaultItems[0].action).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not call action on disabled item click', () => {
    render(<ContextMenu position={{ x: 100, y: 100 }} items={defaultItems} onClose={mockOnClose} />);

    const pasteButton = screen.getByText('Paste').closest('button');
    expect(pasteButton).toBeDisabled();
  });

  it('should close on escape key', () => {
    render(<ContextMenu position={{ x: 100, y: 100 }} items={defaultItems} onClose={mockOnClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should render dividers', () => {
    render(<ContextMenu position={{ x: 100, y: 100 }} items={defaultItems} onClose={mockOnClose} />);

    const dividers = screen.getAllByRole('separator');
    expect(dividers).toHaveLength(1);
  });

  it('should position at specified coordinates', () => {
    render(<ContextMenu position={{ x: 150, y: 200 }} items={defaultItems} onClose={mockOnClose} />);

    const menu = screen.getByRole('menu');
    expect(menu).toHaveStyle({ left: '150px', top: '200px' });
  });

  it('should have menu role', () => {
    render(<ContextMenu position={{ x: 100, y: 100 }} items={defaultItems} onClose={mockOnClose} />);

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('should have menuitem role for items', () => {
    render(<ContextMenu position={{ x: 100, y: 100 }} items={defaultItems} onClose={mockOnClose} />);

    const menuItems = screen.getAllByRole('menuitem');
    // 4 items (excluding divider)
    expect(menuItems).toHaveLength(4);
  });
});
