/**
 * TreeNode Component
 *
 * Recursive component for rendering a single node in the scene hierarchy tree.
 * Displays entity name with expand/collapse, type icon, selection highlighting,
 * inline rename editing, and drag-and-drop reordering.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Entity } from '../../types/entity';
import { EntityType } from '../../types/entity';
import { useSceneStore, useSelectionStore, useCommandStore } from '../../stores';
import { RenameEntityCommand, ReorderEntityCommand, ReparentEntityCommand } from '../../commands';
import styles from './SceneTree.module.css';

interface TreeNodeProps {
  entity: Entity;
  depth?: number;
  index: number;
  siblingCount: number;
  onContextMenu?: (e: React.MouseEvent, entityId: string) => void;
}

type DropPosition = 'before' | 'after' | 'inside' | null;

/**
 * Get icon character for entity type
 */
function getEntityIcon(type: EntityType): string {
  switch (type) {
    case EntityType.Group:
      return '📁';
    case EntityType.Light:
      return '💡';
    case EntityType.CubeMesh:
      return '▣';
    case EntityType.SphereMesh:
      return '●';
    case EntityType.PlaneMesh:
      return '▭';
    case EntityType.CylinderMesh:
      return '⬡';
    case EntityType.CapsuleMesh:
      return '💊';
    case EntityType.TorusMesh:
      return '◎';
    case EntityType.ConeMesh:
      return '▲';
    case EntityType.PyramidMesh:
      return '△';
    case EntityType.TetrahedronMesh:
      return '◬';
    case EntityType.PrismMesh:
      return '⬢';
    case EntityType.ArchMesh:
      return '⌓';
    case EntityType.GltfMesh:
      return '🎨';
    default:
      return '📦';
  }
}

/**
 * Get icon CSS class for entity type
 */
function getIconClass(type: EntityType): string {
  switch (type) {
    case EntityType.Group:
      return styles.iconGroup;
    case EntityType.Light:
      return styles.iconLight;
    default:
      return styles.iconMesh;
  }
}

/**
 * Check if an entity is a descendant of another
 */
function isDescendantOf(ancestorId: string, descendantId: string, entities: Record<string, Entity>): boolean {
  const ancestor = entities[ancestorId];
  if (!ancestor) return false;

  const checkDescendants = (parentId: string): boolean => {
    const parent = entities[parentId];
    if (!parent) return false;
    if (parent.childIds.includes(descendantId)) return true;
    return parent.childIds.some((childId) => checkDescendants(childId));
  };

  return checkDescendants(ancestorId);
}

/**
 * Tree node component for scene hierarchy
 */
export function TreeNode({ entity, depth = 0, index, siblingCount, onContextMenu }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(entity.name);
  const [hasError, setHasError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const getChildren = useSceneStore((state) => state.getChildren);
  const entities = useSceneStore((state) => state.entities);
  const reorderEntity = useSceneStore((state) => state.reorderEntity);
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const setSelected = useSelectionStore((state) => state.setSelected);
  const addToSelection = useSelectionStore((state) => state.addToSelection);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const execute = useCommandStore((state) => state.execute);

  const children = getChildren(entity.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedIds.includes(entity.id);
  const isGroup = entity.type === EntityType.Group;

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded((prev) => !prev);
    },
    []
  );

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        // Multi-select: toggle or add
        if (e.ctrlKey || e.metaKey) {
          toggleSelection(entity.id);
        } else {
          addToSelection([entity.id]);
        }
      } else {
        // Single select: replace selection
        setSelected([entity.id]);
      }
    },
    [entity.id, setSelected, addToSelection, toggleSelection]
  );

  const startEditing = useCallback(() => {
    setEditValue(entity.name);
    setHasError(false);
    setIsEditing(true);
  }, [entity.name]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      startEditing();
    },
    [startEditing]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // F2 to start editing when selected
      if (e.key === 'F2' && isSelected && !isEditing) {
        e.preventDefault();
        startEditing();
      }
    },
    [isSelected, isEditing, startEditing]
  );

  const confirmRename = useCallback(() => {
    const trimmedValue = editValue.trim();

    if (trimmedValue === '') {
      setHasError(true);
      return;
    }

    if (trimmedValue !== entity.name) {
      const command = new RenameEntityCommand(entity.id, entity.name, trimmedValue);
      execute(command);
    }

    setIsEditing(false);
    setHasError(false);
  }, [editValue, entity.id, entity.name, execute]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue(entity.name);
    setHasError(false);
  }, [entity.name]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    },
    [confirmRename, cancelEditing]
  );

  const handleInputBlur = useCallback(() => {
    // Confirm rename on blur (if valid)
    if (editValue.trim() !== '') {
      confirmRename();
    } else {
      cancelEditing();
    }
  }, [editValue, confirmRename, cancelEditing]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
    setHasError(false);
  }, []);

  // Context menu handler
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Select the entity if not already selected
      if (!selectedIds.includes(entity.id)) {
        setSelected([entity.id]);
      }

      if (onContextMenu) {
        onContextMenu(e, entity.id);
      }
    },
    [entity.id, selectedIds, setSelected, onContextMenu]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      console.log('[DragDrop] DragStart:', entity.id, entity.name);
      e.dataTransfer.setData('text/plain', entity.id);
      e.dataTransfer.setData(
        'application/x-tree-node',
        JSON.stringify({ id: entity.id, index, parentId: entity.parentId })
      );
      e.dataTransfer.effectAllowed = 'copyMove';
      setIsDragging(true);
    },
    [entity.id, entity.name, entity.parentId, index]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Check if the drag contains our tree node data type
      // Note: getData() returns empty string during dragover for security reasons,
      // so we check types array instead. Use Array.from() for compatibility since
      // types can be a DOMStringList in some browsers.
      const types = Array.from(e.dataTransfer.types);
      if (!types.includes('application/x-tree-node')) {
        console.log('[DragDrop] DragOver rejected - types:', types);
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      const rect = rowRef.current?.getBoundingClientRect();
      if (!rect) return;

      const y = e.clientY - rect.top;
      const height = rect.height;

      // Determine drop position based on mouse Y position
      // Middle zone = parent to this entity, top/bottom = reorder as sibling
      let newDropPos: 'before' | 'after' | 'inside';
      if (y < height * 0.25) {
        newDropPos = 'before';
      } else if (y > height * 0.75) {
        newDropPos = 'after';
      } else {
        newDropPos = 'inside'; // Can parent to any entity, not just Groups
      }

      console.log('[DragDrop] DragOver:', entity.name, 'position:', newDropPos);
      setDropPosition(newDropPos);

      e.dataTransfer.dropEffect = 'move';
    },
    [entity.name]
  );

  const handleDragLeave = useCallback(() => {
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropPosition(null);

      console.log('[DragDrop] Drop on:', entity.name);

      const dragDataStr = e.dataTransfer.getData('application/x-tree-node');
      if (!dragDataStr) {
        console.log('[DragDrop] Drop rejected - no drag data');
        return;
      }

      const dragData = JSON.parse(dragDataStr) as { id: string; index: number; parentId: string | null };
      console.log('[DragDrop] Dragged entity:', dragData);

      // Don't drop on self
      if (dragData.id === entity.id) {
        console.log('[DragDrop] Drop rejected - same entity');
        return;
      }

      // Calculate drop position based on mouse Y
      const rect = rowRef.current?.getBoundingClientRect();
      if (!rect) {
        console.log('[DragDrop] Drop rejected - no rect');
        return;
      }

      const y = e.clientY - rect.top;
      const height = rect.height;

      const draggedEntity = entities[dragData.id];
      if (!draggedEntity) {
        console.log('[DragDrop] Drop rejected - dragged entity not found');
        return;
      }

      // Determine drop position
      // Middle zone = parent to this entity, top/bottom = reorder as sibling
      let dropPos: 'before' | 'after' | 'inside';
      if (y < height * 0.25) {
        dropPos = 'before';
      } else if (y > height * 0.75) {
        dropPos = 'after';
      } else {
        dropPos = 'inside'; // Can parent to any entity
      }

      console.log('[DragDrop] Drop position:', dropPos);

      // Handle "inside" drop (reparenting to become child of target)
      if (dropPos === 'inside') {
        // Prevent circular reparenting
        if (isDescendantOf(dragData.id, entity.id, entities)) {
          console.log('[DragDrop] Drop rejected - circular reparenting');
          return; // Can't parent to own descendant
        }

        console.log('[DragDrop] Executing ReparentEntityCommand - parenting to:', entity.name);
        const command = new ReparentEntityCommand(
          dragData.id,
          draggedEntity.parentId,
          entity.id, // New parent
          dragData.index
        );
        execute(command);
        return;
      }

      // Handle reordering (before/after)
      // Only if same parent level
      if (draggedEntity.parentId === entity.parentId) {
        let newIndex: number;
        if (dropPos === 'before') {
          newIndex = index;
        } else {
          newIndex = index + 1;
        }

        // Adjust index if dragging from before to after within same list
        if (dragData.index < newIndex) {
          newIndex -= 1;
        }

        // Only reorder if indices are different
        if (dragData.index !== newIndex) {
          const command = new ReorderEntityCommand(dragData.id, dragData.index, newIndex);
          execute(command);
        }
      } else {
        // Different parent - reparent to this entity's parent at appropriate position
        let newIndex: number;
        if (dropPos === 'before') {
          newIndex = index;
        } else {
          newIndex = index + 1;
        }

        const command = new ReparentEntityCommand(
          dragData.id,
          draggedEntity.parentId,
          entity.parentId, // Same parent as drop target
          dragData.index,
          newIndex
        );
        execute(command);
      }
    },
    [entity.id, entity.parentId, index, isGroup, entities, execute]
  );

  const rowClasses = [styles.nodeRow];
  if (isSelected) {
    rowClasses.push(styles.nodeRowSelected);
  }
  if (isDragging) {
    rowClasses.push(styles.nodeRowDragging);
  }
  if (dropPosition === 'inside') {
    rowClasses.push(styles.nodeRowDropTarget);
  }

  const expandClasses = [styles.expandButton];
  if (expanded) {
    expandClasses.push(styles.expandButtonExpanded);
  }

  const inputClasses = [styles.nameInput];
  if (hasError) {
    inputClasses.push(styles.nameInputError);
  }

  // Build class names - include plain classes for E2E test selectors
  const nodeClasses = [styles.treeNode];
  if (isSelected) {
    nodeClasses.push('selected');
  }
  if (hasChildren && !expanded) {
    nodeClasses.push('collapsed');
  }

  return (
    <div
      className={nodeClasses.join(' ')}
      data-testid={`tree-node-${entity.id}`}
      style={{ position: 'relative' }}
    >
      {dropPosition === 'before' && (
        <div className={`${styles.dropIndicator} ${styles.dropIndicatorTop}`} />
      )}

      <div
        ref={rowRef}
        className={rowClasses.join(' ')}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid={`tree-node-row-${entity.id}`}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        {hasChildren ? (
          <button
            className={`${expandClasses.join(' ')} tree-node-toggle`}
            onClick={handleToggleExpand}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            data-testid={`tree-node-expand-${entity.id}`}
          >
            ▶
          </button>
        ) : (
          <span className={styles.expandPlaceholder} />
        )}

        <span className={`${styles.icon} ${getIconClass(entity.type)}`}>
          {getEntityIcon(entity.type)}
        </span>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className={inputClasses.join(' ')}
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            data-testid={`tree-node-input-${entity.id}`}
            aria-label="Entity name"
            aria-invalid={hasError}
          />
        ) : (
          <span
            className={`${styles.nodeName} tree-node-name`}
            title={entity.name}
            onDoubleClick={handleDoubleClick}
          >
            {entity.name}
          </span>
        )}
      </div>

      {dropPosition === 'after' && (
        <div className={`${styles.dropIndicator} ${styles.dropIndicatorBottom}`} />
      )}

      {hasChildren && expanded && (
        <div className={styles.children} role="group">
          {children.map((child, childIndex) => (
            <TreeNode
              key={child.id}
              entity={child}
              depth={depth + 1}
              index={childIndex}
              siblingCount={children.length}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TreeNode;
