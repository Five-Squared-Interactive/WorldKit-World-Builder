/**
 * PropertiesPanel Component
 *
 * Displays and allows editing of selected object properties.
 * Includes editable transform inputs for position, rotation (euler), and scale.
 * Also supports inline name editing and color picking for primitives.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Euler, Quaternion } from 'three';
import { useSelectionStore, useSceneStore, useCommandStore } from '../../stores';
import { Panel } from '../../components/Panel';
import { Vector3Input, Vector3Value } from './Vector3Input';
import { MoveEntityCommand } from '../../commands/MoveEntityCommand';
import { RotateEntityCommand } from '../../commands/RotateEntityCommand';
import { ScaleEntityCommand } from '../../commands/ScaleEntityCommand';
import { RenameEntityCommand } from '../../commands/RenameEntityCommand';
import { ChangeColorCommand } from '../../commands/ChangeColorCommand';
import type { Quaternion as QuaternionType } from '../../types/entity';
import { EntityType, DEFAULT_PRIMITIVE_COLOR } from '../../types/entity';

/**
 * Convert quaternion to euler angles (in degrees)
 */
function quaternionToEulerDegrees(q: QuaternionType): Vector3Value {
  const quaternion = new Quaternion(q.x, q.y, q.z, q.w);
  const euler = new Euler().setFromQuaternion(quaternion, 'XYZ');
  return {
    x: (euler.x * 180) / Math.PI,
    y: (euler.y * 180) / Math.PI,
    z: (euler.z * 180) / Math.PI,
  };
}

/**
 * Convert euler angles (in degrees) to quaternion
 */
function eulerDegreesToQuaternion(euler: Vector3Value): QuaternionType {
  const eulerRad = new Euler(
    (euler.x * Math.PI) / 180,
    (euler.y * Math.PI) / 180,
    (euler.z * Math.PI) / 180,
    'XYZ'
  );
  const quaternion = new Quaternion().setFromEuler(eulerRad);
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };
}

/**
 * Check if entity type is a primitive mesh (supports color)
 */
function isPrimitiveMesh(type: EntityType): boolean {
  return (
    type === EntityType.CubeMesh ||
    type === EntityType.SphereMesh ||
    type === EntityType.PlaneMesh ||
    type === EntityType.CylinderMesh ||
    type === EntityType.CapsuleMesh ||
    type === EntityType.TorusMesh ||
    type === EntityType.ConeMesh ||
    type === EntityType.PyramidMesh ||
    type === EntityType.TetrahedronMesh ||
    type === EntityType.PrismMesh ||
    type === EntityType.ArchMesh
  );
}

/**
 * Properties inspector panel
 */
export function PropertiesPanel() {
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const entities = useSceneStore((state) => state.entities);
  const executeCommand = useCommandStore((state) => state.execute);

  const selectedCount = selectedIds.length;
  const firstSelected = selectedCount > 0 ? entities[selectedIds[0]] : null;
  const entityId = firstSelected?.id;

  // Name editing state
  const [editingName, setEditingName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const originalNameRef = useRef<string>('');

  // Color editing state
  const [colorHex, setColorHex] = useState('');
  const originalColorRef = useRef<string | undefined>(undefined);

  // Sync name when selection changes
  useEffect(() => {
    if (firstSelected) {
      setEditingName(firstSelected.name);
      setColorHex(firstSelected.color ?? DEFAULT_PRIMITIVE_COLOR);
    }
  }, [firstSelected?.id, firstSelected?.name, firstSelected?.color]);

  // Memoize transform values to avoid unnecessary re-renders
  const position = useMemo(
    () => firstSelected?.transform.position ?? { x: 0, y: 0, z: 0 },
    [firstSelected?.transform.position]
  );

  const rotationQuat = useMemo(
    () => firstSelected?.transform.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
    [firstSelected?.transform.rotation]
  );

  const rotationEuler = useMemo(
    () => quaternionToEulerDegrees(rotationQuat),
    [rotationQuat]
  );

  const scale = useMemo(
    () => firstSelected?.transform.scale ?? { x: 1, y: 1, z: 1 },
    [firstSelected?.transform.scale]
  );

  // Refs to track original values at start of editing (for undo/redo)
  const originalPositionRef = useRef<Vector3Value | null>(null);
  const originalRotationRef = useRef<QuaternionType | null>(null);
  const originalScaleRef = useRef<Vector3Value | null>(null);

  // Handle position change
  const handlePositionChange = useCallback(
    (newPosition: Vector3Value) => {
      if (!entityId) return;
      // Capture original value on first change
      if (originalPositionRef.current === null) {
        originalPositionRef.current = { ...position };
      }
      // Real-time update without command (for immediate feedback)
      useSceneStore.getState().updateEntityTransform(entityId, {
        position: newPosition,
      });
    },
    [entityId, position]
  );

  // Handle position commit (create command for undo/redo)
  const handlePositionCommit = useCallback(
    (newPosition: Vector3Value) => {
      if (!entityId) return;
      const oldPosition = originalPositionRef.current ?? position;

      // Check if position actually changed
      const changed =
        Math.abs(oldPosition.x - newPosition.x) > 0.0001 ||
        Math.abs(oldPosition.y - newPosition.y) > 0.0001 ||
        Math.abs(oldPosition.z - newPosition.z) > 0.0001;

      if (changed) {
        const command = new MoveEntityCommand(entityId, oldPosition, newPosition);
        executeCommand(command);
      }

      // Reset ref after commit
      originalPositionRef.current = null;
    },
    [entityId, position, executeCommand]
  );

  // Handle rotation change (euler degrees)
  const handleRotationChange = useCallback(
    (newEuler: Vector3Value) => {
      if (!entityId) return;
      // Capture original value on first change
      if (originalRotationRef.current === null) {
        originalRotationRef.current = { ...rotationQuat };
      }
      const newQuat = eulerDegreesToQuaternion(newEuler);
      // Real-time update without command
      useSceneStore.getState().updateEntityTransform(entityId, {
        rotation: newQuat,
      });
    },
    [entityId, rotationQuat]
  );

  // Handle rotation commit
  const handleRotationCommit = useCallback(
    (newEuler: Vector3Value) => {
      if (!entityId) return;
      const oldQuat = originalRotationRef.current ?? rotationQuat;
      const newQuat = eulerDegreesToQuaternion(newEuler);

      // Check if rotation actually changed
      const changed =
        Math.abs(oldQuat.x - newQuat.x) > 0.0001 ||
        Math.abs(oldQuat.y - newQuat.y) > 0.0001 ||
        Math.abs(oldQuat.z - newQuat.z) > 0.0001 ||
        Math.abs(oldQuat.w - newQuat.w) > 0.0001;

      if (changed) {
        const command = new RotateEntityCommand(entityId, oldQuat, newQuat);
        executeCommand(command);
      }

      // Reset ref after commit
      originalRotationRef.current = null;
    },
    [entityId, rotationQuat, executeCommand]
  );

  // Handle scale change
  const handleScaleChange = useCallback(
    (newScale: Vector3Value) => {
      if (!entityId) return;
      // Capture original value on first change
      if (originalScaleRef.current === null) {
        originalScaleRef.current = { ...scale };
      }
      // Real-time update without command
      useSceneStore.getState().updateEntityTransform(entityId, {
        scale: newScale,
      });
    },
    [entityId, scale]
  );

  // Handle scale commit
  const handleScaleCommit = useCallback(
    (newScale: Vector3Value) => {
      if (!entityId) return;
      const oldScale = originalScaleRef.current ?? scale;

      // Check if scale actually changed
      const changed =
        Math.abs(oldScale.x - newScale.x) > 0.0001 ||
        Math.abs(oldScale.y - newScale.y) > 0.0001 ||
        Math.abs(oldScale.z - newScale.z) > 0.0001;

      if (changed) {
        const command = new ScaleEntityCommand(entityId, oldScale, newScale);
        executeCommand(command);
      }

      // Reset ref after commit
      originalScaleRef.current = null;
    },
    [entityId, scale, executeCommand]
  );

  // Name editing handlers
  const handleNameFocus = useCallback(() => {
    if (firstSelected) {
      originalNameRef.current = firstSelected.name;
      setIsEditingName(true);
    }
  }, [firstSelected]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  }, []);

  const handleNameCommit = useCallback(() => {
    if (!entityId || !firstSelected) return;
    const trimmedName = editingName.trim();

    if (trimmedName !== '' && trimmedName !== originalNameRef.current) {
      const command = new RenameEntityCommand(entityId, originalNameRef.current, trimmedName);
      executeCommand(command);
    } else if (trimmedName === '') {
      // Revert to original if empty
      setEditingName(originalNameRef.current);
    }

    setIsEditingName(false);
  }, [entityId, firstSelected, editingName, executeCommand]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNameCommit();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditingName(originalNameRef.current);
        setIsEditingName(false);
        (e.target as HTMLInputElement).blur();
      }
    },
    [handleNameCommit]
  );

  // Color editing handlers
  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!entityId) return;

      // Capture original on first change
      if (originalColorRef.current === undefined) {
        originalColorRef.current = firstSelected?.color;
      }

      const newColor = e.target.value;
      setColorHex(newColor);

      // Real-time update without command
      useSceneStore.getState().updateEntity(entityId, { color: newColor });
    },
    [entityId, firstSelected?.color]
  );

  const handleColorCommit = useCallback(() => {
    if (!entityId) return;
    const oldColor = originalColorRef.current;
    const newColor = colorHex;

    if (oldColor !== newColor) {
      const command = new ChangeColorCommand(entityId, oldColor, newColor);
      executeCommand(command);
    }

    originalColorRef.current = undefined;
  }, [entityId, colorHex, executeCommand]);

  const handleColorHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setColorHex(value);

      // Only apply if valid hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(value) && entityId) {
        if (originalColorRef.current === undefined) {
          originalColorRef.current = firstSelected?.color;
        }
        useSceneStore.getState().updateEntity(entityId, { color: value });
      }
    },
    [entityId, firstSelected?.color]
  );

  return (
    <Panel title="Properties" testId="properties-panel">
      <div className="properties-content">
        {selectedCount === 0 ? (
          <div className="empty-state">
            <p>No selection</p>
            <p className="hint">Select an object to view properties</p>
          </div>
        ) : selectedCount === 1 && firstSelected ? (
          <div className="property-sections">
            <div className="property-section">
              <h4>Object</h4>
              <div className="property-row">
                <label>Name</label>
                <input
                  type="text"
                  className="property-input"
                  value={editingName}
                  onChange={handleNameChange}
                  onFocus={handleNameFocus}
                  onBlur={handleNameCommit}
                  onKeyDown={handleNameKeyDown}
                  data-testid="name-input"
                />
              </div>
              <div className="property-row">
                <label>Type</label>
                <span className="property-value">{firstSelected.type}</span>
              </div>
            </div>

            <div className="property-section">
              <h4>Transform</h4>
              <Vector3Input
                label="Position"
                value={position}
                onChange={handlePositionChange}
                onCommit={handlePositionCommit}
                precision={2}
                step={0.1}
                testId="position-input"
              />
              <Vector3Input
                label="Rotation"
                value={rotationEuler}
                onChange={handleRotationChange}
                onCommit={handleRotationCommit}
                precision={1}
                step={1}
                testId="rotation-input"
              />
              <Vector3Input
                label="Scale"
                value={scale}
                onChange={handleScaleChange}
                onCommit={handleScaleCommit}
                precision={2}
                step={0.1}
                testId="scale-input"
              />
            </div>

            {isPrimitiveMesh(firstSelected.type) && (
              <div className="property-section">
                <h4>Appearance</h4>
                <div className="property-row color-row">
                  <label>Color</label>
                  <div className="color-inputs">
                    <input
                      type="color"
                      className="color-picker"
                      value={colorHex}
                      onChange={handleColorChange}
                      onBlur={handleColorCommit}
                      data-testid="color-picker"
                    />
                    <input
                      type="text"
                      className="color-hex-input"
                      value={colorHex}
                      onChange={handleColorHexChange}
                      onBlur={handleColorCommit}
                      placeholder="#808080"
                      data-testid="color-hex-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="multi-select-state">
            <p>{selectedCount} objects selected</p>
            <p className="hint">Select a single object to edit properties</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default PropertiesPanel;
