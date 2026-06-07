/**
 * Vector3Input Component
 *
 * Editable X, Y, Z input fields for transform properties.
 * Displays values with appropriate precision and updates on change.
 */

import { useState, useEffect, useCallback } from 'react';

export interface Vector3Value {
  x: number;
  y: number;
  z: number;
}

export interface Vector3InputProps {
  /** Current vector value */
  value: Vector3Value;
  /** Callback when value changes */
  onChange: (value: Vector3Value) => void;
  /** Callback when editing is complete (blur/enter) */
  onCommit?: (value: Vector3Value) => void;
  /** Number of decimal places to display */
  precision?: number;
  /** Step increment for arrow keys/scroll */
  step?: number;
  /** Label for the input group */
  label: string;
  /** Test ID prefix */
  testId?: string;
  /** Whether input is disabled */
  disabled?: boolean;
}

/**
 * Input component for Vector3 values (X, Y, Z)
 */
export function Vector3Input({
  value,
  onChange,
  onCommit,
  precision = 2,
  step = 0.1,
  label,
  testId,
  disabled = false,
}: Vector3InputProps) {
  // Local state for controlled input editing
  const [localValues, setLocalValues] = useState({
    x: value.x.toFixed(precision),
    y: value.y.toFixed(precision),
    z: value.z.toFixed(precision),
  });

  // Track which field is being edited
  const [editingField, setEditingField] = useState<'x' | 'y' | 'z' | null>(null);

  // Sync local values when external value changes (but not during editing)
  useEffect(() => {
    if (!editingField) {
      setLocalValues({
        x: value.x.toFixed(precision),
        y: value.y.toFixed(precision),
        z: value.z.toFixed(precision),
      });
    }
  }, [value.x, value.y, value.z, precision, editingField]);

  const handleInputChange = useCallback(
    (axis: 'x' | 'y' | 'z', inputValue: string) => {
      // Update local display value
      setLocalValues((prev) => ({
        ...prev,
        [axis]: inputValue,
      }));

      // Parse and update if valid number
      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) {
        const newValue = {
          ...value,
          [axis]: parsed,
        };
        onChange(newValue);
      }
    },
    [value, onChange]
  );

  const handleFocus = useCallback((axis: 'x' | 'y' | 'z') => {
    setEditingField(axis);
  }, []);

  const handleBlur = useCallback(
    (axis: 'x' | 'y' | 'z') => {
      setEditingField(null);

      // Parse the final value
      const parsed = parseFloat(localValues[axis]);
      const finalValue = isNaN(parsed) ? value[axis] : parsed;

      // Format the display value
      setLocalValues((prev) => ({
        ...prev,
        [axis]: finalValue.toFixed(precision),
      }));

      // Commit the change
      if (onCommit) {
        const newValue = {
          ...value,
          [axis]: finalValue,
        };
        onCommit(newValue);
      }
    },
    [localValues, value, precision, onCommit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, axis: 'x' | 'y' | 'z') => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const delta = e.key === 'ArrowUp' ? step : -step;
        const multiplier = e.shiftKey ? 10 : 1;
        const newValue = value[axis] + delta * multiplier;

        setLocalValues((prev) => ({
          ...prev,
          [axis]: newValue.toFixed(precision),
        }));

        onChange({
          ...value,
          [axis]: newValue,
        });
      }
    },
    [value, onChange, step, precision]
  );

  const renderAxisInput = (axis: 'x' | 'y' | 'z', axisLabel: string) => (
    <div className="vector3-axis" key={axis}>
      <label className={`vector3-axis-label vector3-axis-${axis}`}>{axisLabel}</label>
      <input
        type="text"
        className="vector3-input"
        value={localValues[axis]}
        onChange={(e) => handleInputChange(axis, e.target.value)}
        onFocus={() => handleFocus(axis)}
        onBlur={() => handleBlur(axis)}
        onKeyDown={(e) => handleKeyDown(e, axis)}
        disabled={disabled}
        data-testid={testId ? `${testId}-${axis}` : undefined}
      />
    </div>
  );

  return (
    <div className="vector3-input-group" data-testid={testId}>
      <label className="vector3-label">{label}</label>
      <div className="vector3-inputs">
        {renderAxisInput('x', 'X')}
        {renderAxisInput('y', 'Y')}
        {renderAxisInput('z', 'Z')}
      </div>
    </div>
  );
}

export default Vector3Input;
