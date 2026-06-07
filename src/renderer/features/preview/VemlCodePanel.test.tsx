import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VemlCodePanel } from './VemlCodePanel';
import { useSceneStore, useProjectStore } from '../../stores';
import { EntityType, type Entity } from '../../types/entity';

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('VemlCodePanel', () => {
  beforeEach(() => {
    // Reset stores
    useSceneStore.setState({ entities: {}, rootIds: [] });
    useProjectStore.getState().newProject();
    mockWriteText.mockClear();
  });

  it('renders the panel', () => {
    render(<VemlCodePanel />);
    expect(screen.getByTestId('veml-code-panel')).toBeInTheDocument();
  });

  it('displays the panel title', () => {
    render(<VemlCodePanel />);
    expect(screen.getByText('VEML Code')).toBeInTheDocument();
  });

  it('displays a copy button', () => {
    render(<VemlCodePanel />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('displays a close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<VemlCodePanel onClose={onClose} />);
    expect(screen.getByLabelText('Close panel')).toBeInTheDocument();
  });

  it('does not display close button when onClose is not provided', () => {
    render(<VemlCodePanel />);
    expect(screen.queryByLabelText('Close panel')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<VemlCodePanel onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close panel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays the line count', () => {
    render(<VemlCodePanel />);
    // The VEML output will have some lines
    expect(screen.getByText(/lines$/)).toBeInTheDocument();
  });

  it('renders VEML with basic structure', () => {
    render(<VemlCodePanel />);
    const codeElement = screen.getByTestId('veml-code-panel');
    // Check for VEML root element
    expect(codeElement.textContent).toContain('veml');
  });

  it('copies VEML to clipboard when copy button is clicked', async () => {
    render(<VemlCodePanel />);
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });
    // The clipboard should receive valid VEML
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('veml'));
  });

  it('shows "Copied!" after clicking copy', async () => {
    render(<VemlCodePanel />);
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('updates VEML when scene changes', () => {
    const { rerender } = render(<VemlCodePanel />);
    const initialContent = screen.getByTestId('veml-code-panel').textContent;

    // Add an entity to the scene
    const entity: Entity = {
      id: 'test-cube',
      name: 'Test Cube',
      type: EntityType.CubeMesh,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      parentId: null,
      childIds: [],
      visible: true,
      locked: false,
    };
    useSceneStore.setState({
      entities: { 'test-cube': entity },
      rootIds: ['test-cube'],
    });

    // Re-render with new state
    rerender(<VemlCodePanel />);

    const updatedContent = screen.getByTestId('veml-code-panel').textContent;
    expect(updatedContent).not.toBe(initialContent);
    expect(updatedContent).toContain('Test Cube');
  });

  it('includes project metadata in VEML output', () => {
    useProjectStore.setState({
      metadata: {
        name: 'Test Project',
        description: 'Test Description',
        author: 'Test Author',
        path: null,
        lastSaved: null,
      },
      isNew: true,
      isDirty: false,
    });

    render(<VemlCodePanel />);
    const codeElement = screen.getByTestId('veml-code-panel');
    expect(codeElement.textContent).toContain('Test Project');
  });

  it('applies XML syntax highlighting', () => {
    render(<VemlCodePanel />);
    // Check for syntax highlighting classes in the HTML
    const codeContainer = document.querySelector('[class*="code"]');
    expect(codeContainer).toBeInTheDocument();
    // The highlighter adds spans with specific classes
    expect(codeContainer?.innerHTML).toContain('xml-tag');
  });

  it('handles entities with different types', () => {
    const sphereEntity: Entity = {
      id: 'test-sphere',
      name: 'Test Sphere',
      type: EntityType.SphereMesh,
      transform: {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      parentId: null,
      childIds: [],
      visible: true,
      locked: false,
    };

    useSceneStore.setState({
      entities: { 'test-sphere': sphereEntity },
      rootIds: ['test-sphere'],
    });

    render(<VemlCodePanel />);
    const codeElement = screen.getByTestId('veml-code-panel');
    expect(codeElement.textContent).toContain('sphere');
  });

  it('handles nested entities (parent-child relationships)', () => {
    const parentEntity: Entity = {
      id: 'parent',
      name: 'Parent',
      type: EntityType.Group,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      parentId: null,
      childIds: ['child'],
      visible: true,
      locked: false,
    };

    const childEntity: Entity = {
      id: 'child',
      name: 'Child',
      type: EntityType.CubeMesh,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      parentId: 'parent',
      childIds: [],
      visible: true,
      locked: false,
    };

    useSceneStore.setState({
      entities: { parent: parentEntity, child: childEntity },
      rootIds: ['parent'],
    });

    render(<VemlCodePanel />);
    const codeElement = screen.getByTestId('veml-code-panel');
    expect(codeElement.textContent).toContain('Parent');
    expect(codeElement.textContent).toContain('Child');
  });
});
