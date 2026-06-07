/**
 * Vector3Input Tests
 *
 * Tests for the Vector3Input component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Vector3Input } from './Vector3Input';

describe('Vector3Input', () => {
  const defaultProps = {
    label: 'Position',
    value: { x: 1, y: 2, z: 3 },
    onChange: vi.fn(),
    onCommit: vi.fn(),
    testId: 'test-input',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render label and three input fields', () => {
    render(<Vector3Input {...defaultProps} />);

    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByTestId('test-input-x')).toBeInTheDocument();
    expect(screen.getByTestId('test-input-y')).toBeInTheDocument();
    expect(screen.getByTestId('test-input-z')).toBeInTheDocument();
  });

  it('should display formatted values with default precision', () => {
    render(<Vector3Input {...defaultProps} />);

    expect(screen.getByTestId('test-input-x')).toHaveValue('1.00');
    expect(screen.getByTestId('test-input-y')).toHaveValue('2.00');
    expect(screen.getByTestId('test-input-z')).toHaveValue('3.00');
  });

  it('should display values with custom precision', () => {
    render(<Vector3Input {...defaultProps} precision={1} />);

    expect(screen.getByTestId('test-input-x')).toHaveValue('1.0');
    expect(screen.getByTestId('test-input-y')).toHaveValue('2.0');
    expect(screen.getByTestId('test-input-z')).toHaveValue('3.0');
  });

  it('should call onChange when input value changes', () => {
    const onChange = vi.fn();
    render(<Vector3Input {...defaultProps} onChange={onChange} />);

    const xInput = screen.getByTestId('test-input-x');
    fireEvent.change(xInput, { target: { value: '5' } });

    expect(onChange).toHaveBeenCalledWith({ x: 5, y: 2, z: 3 });
  });

  it('should call onCommit when input loses focus', () => {
    const onCommit = vi.fn();
    render(<Vector3Input {...defaultProps} onCommit={onCommit} />);

    const xInput = screen.getByTestId('test-input-x');
    fireEvent.change(xInput, { target: { value: '10' } });
    fireEvent.blur(xInput);

    expect(onCommit).toHaveBeenCalledWith({ x: 10, y: 2, z: 3 });
  });

  it('should increment value with ArrowUp key', () => {
    const onChange = vi.fn();
    render(<Vector3Input {...defaultProps} onChange={onChange} step={0.1} />);

    const zInput = screen.getByTestId('test-input-z');
    zInput.focus();
    fireEvent.keyDown(zInput, { key: 'ArrowUp' });

    expect(onChange).toHaveBeenCalledWith({ x: 1, y: 2, z: 3.1 });
  });

  it('should decrement value with ArrowDown key', () => {
    const onChange = vi.fn();
    render(<Vector3Input {...defaultProps} onChange={onChange} step={0.1} />);

    const zInput = screen.getByTestId('test-input-z');
    zInput.focus();
    fireEvent.keyDown(zInput, { key: 'ArrowDown' });

    expect(onChange).toHaveBeenCalledWith({ x: 1, y: 2, z: 2.9 });
  });

  it('should use larger step with Shift+ArrowUp', () => {
    const onChange = vi.fn();
    render(<Vector3Input {...defaultProps} onChange={onChange} step={0.1} />);

    const xInput = screen.getByTestId('test-input-x');
    xInput.focus();
    fireEvent.keyDown(xInput, { key: 'ArrowUp', shiftKey: true });

    expect(onChange).toHaveBeenCalledWith({ x: 2, y: 2, z: 3 });
  });

  it('should not call onChange with invalid input', () => {
    const onChange = vi.fn();
    render(<Vector3Input {...defaultProps} onChange={onChange} />);

    const xInput = screen.getByTestId('test-input-x');
    fireEvent.change(xInput, { target: { value: 'abc' } });

    // onChange should not be called with invalid values
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should restore valid value on blur with invalid input', () => {
    const onCommit = vi.fn();
    render(<Vector3Input {...defaultProps} onCommit={onCommit} />);

    const xInput = screen.getByTestId('test-input-x');
    fireEvent.change(xInput, { target: { value: 'invalid' } });
    fireEvent.blur(xInput);

    // Should restore original value
    expect(xInput).toHaveValue('1.00');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Vector3Input {...defaultProps} disabled />);

    expect(screen.getByTestId('test-input-x')).toBeDisabled();
    expect(screen.getByTestId('test-input-y')).toBeDisabled();
    expect(screen.getByTestId('test-input-z')).toBeDisabled();
  });

  it('should display axis labels with correct colors', () => {
    render(<Vector3Input {...defaultProps} />);

    expect(screen.getByText('X')).toHaveClass('vector3-axis-x');
    expect(screen.getByText('Y')).toHaveClass('vector3-axis-y');
    expect(screen.getByText('Z')).toHaveClass('vector3-axis-z');
  });

  it('should update display when external value changes', () => {
    const { rerender } = render(<Vector3Input {...defaultProps} />);

    expect(screen.getByTestId('test-input-x')).toHaveValue('1.00');

    rerender(<Vector3Input {...defaultProps} value={{ x: 5, y: 6, z: 7 }} />);

    expect(screen.getByTestId('test-input-x')).toHaveValue('5.00');
    expect(screen.getByTestId('test-input-y')).toHaveValue('6.00');
    expect(screen.getByTestId('test-input-z')).toHaveValue('7.00');
  });
});
