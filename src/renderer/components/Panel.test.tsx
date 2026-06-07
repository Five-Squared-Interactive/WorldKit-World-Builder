/**
 * Panel Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('Panel', () => {
  it('renders the panel title', () => {
    render(<Panel title="Test Panel">Content</Panel>);
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<Panel title="Test">Child Content</Panel>);
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Panel title="Test" className="custom-class">Content</Panel>);
    const panel = screen.getByText('Test').closest('.panel');
    expect(panel).toHaveClass('custom-class');
  });

  it('applies testId for testing', () => {
    render(<Panel title="Test" testId="test-panel">Content</Panel>);
    expect(screen.getByTestId('test-panel')).toBeInTheDocument();
  });

  it('has panel-header and panel-content structure', () => {
    render(<Panel title="Test" testId="panel">Content</Panel>);
    const panel = screen.getByTestId('panel');
    expect(panel.querySelector('.panel-header')).toBeInTheDocument();
    expect(panel.querySelector('.panel-content')).toBeInTheDocument();
  });

  it('displays title in panel-title span', () => {
    render(<Panel title="My Title">Content</Panel>);
    const titleSpan = screen.getByText('My Title');
    expect(titleSpan).toHaveClass('panel-title');
  });
});
