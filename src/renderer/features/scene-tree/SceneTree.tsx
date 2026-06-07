/**
 * SceneTree Component
 *
 * Displays the scene hierarchy as a tree view.
 * Shows all objects with parent-child relationships, selection highlighting,
 * and expand/collapse for groups.
 */

import { useState, useCallback } from 'react';
import { useSceneStore, useSelectionStore, useCommandStore, useClipboardStore } from '../../stores';
import { Panel } from '../../components/Panel';
import { TreeNode } from './TreeNode';
import { ContextMenu, type ContextMenuPosition, type ContextMenuItem } from './ContextMenu';
import { DeleteEntityCommand } from '../../commands/DeleteEntityCommand';
import { DuplicateEntityCommand } from '../../commands/DuplicateEntityCommand';
import { CutEntitiesCommand } from '../../commands/CutEntitiesCommand';
import { PasteEntitiesCommand } from '../../commands/PasteEntitiesCommand';
import { AddEntityCommand } from '../../commands/AddEntityCommand';
import { createPrimitiveEntity, createGltfEntity, instantiatePrefab } from '../../features/primitives/createPrimitive';
import type { Asset } from '../../types/asset';
import styles from './SceneTree.module.css';

/**
 * Scene hierarchy tree panel
 */
export function SceneTree() {
  const rootIds = useSceneStore((state) => state.rootIds);
  const entities = useSceneStore((state) => state.entities);
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const executeCommand = useCommandStore((state) => state.execute);
  const hasClipboardContent = useClipboardStore((state) => state.clipboard !== null);
  const copyEntities = useClipboardStore((state) => state.copyEntities);

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuTargetId, setContextMenuTargetId] = useState<string | null>(null);

  // Drag-drop state for asset library drops
  const [isDragOver, setIsDragOver] = useState(false);

  const rootEntities = rootIds
    .map((id) => entities[id])
    .filter((entity) => entity !== undefined);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only clear if clicking directly on the tree background, not a node
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, entityId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuTargetId(entityId);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuPosition(null);
    setContextMenuTargetId(null);
  }, []);

  // Drag-drop handlers for asset library drops
  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Accept drops from asset library
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('application/worldkit-asset')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const assetData = e.dataTransfer.getData('application/worldkit-asset');
      if (!assetData) return;

      try {
        const asset: Asset = JSON.parse(assetData);
        const existingNames = Object.values(entities).map((ent) => ent.name);

        // Handle primitive assets
        if (asset.primitiveType) {
          const entity = createPrimitiveEntity(asset.primitiveType, existingNames);
          const command = new AddEntityCommand(entity);
          executeCommand(command);
        } else if (asset.prefabData) {
          // Handle prefab assets
          const newEntities = instantiatePrefab(
            asset.prefabData.entities,
            asset.prefabData.rootId,
            existingNames
          );

          for (const entity of newEntities) {
            const command = new AddEntityCommand(entity);
            executeCommand(command);
          }
        } else if (asset.filePath) {
          // Handle GLTF assets
          const entity = createGltfEntity(asset.filePath, existingNames);
          const command = new AddEntityCommand(entity);
          executeCommand(command);
        }
      } catch (err) {
        console.error('Failed to parse dropped asset:', err);
      }
    },
    [entities, executeCommand]
  );

  // Build context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: 'Cut',
      shortcut: 'Ctrl+X',
      action: () => {
        if (selectedIds.length > 0) {
          const command = new CutEntitiesCommand([...selectedIds]);
          executeCommand(command);
        }
      },
      disabled: selectedIds.length === 0,
    },
    {
      label: 'Copy',
      shortcut: 'Ctrl+C',
      action: () => {
        if (selectedIds.length > 0) {
          copyEntities([...selectedIds]);
        }
      },
      disabled: selectedIds.length === 0,
    },
    {
      label: 'Paste',
      shortcut: 'Ctrl+V',
      action: () => {
        if (hasClipboardContent) {
          const command = new PasteEntitiesCommand();
          executeCommand(command);
        }
      },
      disabled: !hasClipboardContent,
    },
    { type: 'divider' },
    {
      label: 'Duplicate',
      shortcut: 'Ctrl+D',
      action: () => {
        if (selectedIds.length > 0) {
          const command = new DuplicateEntityCommand([...selectedIds]);
          executeCommand(command);
        }
      },
      disabled: selectedIds.length === 0,
    },
    {
      label: 'Delete',
      shortcut: 'Del',
      action: () => {
        if (selectedIds.length > 0) {
          const command = new DeleteEntityCommand([...selectedIds]);
          executeCommand(command);
        }
      },
      disabled: selectedIds.length === 0,
    },
  ];

  return (
    <Panel title="Scene" testId="scene-tree">
      <div
        className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="scene-tree-drop-zone"
      >
        {rootEntities.length === 0 ? (
          <div className={styles.empty}>
            <p>No objects in scene</p>
            <p className={styles.emptyHint}>Drag assets from the library below</p>
          </div>
        ) : (
          <div
            className={styles.tree}
            onClick={handleBackgroundClick}
            role="tree"
            aria-label="Scene hierarchy"
            data-testid="scene-tree-content"
          >
            {rootEntities.map((entity, index) => (
              <TreeNode
                key={entity.id}
                entity={entity}
                index={index}
                siblingCount={rootEntities.length}
                onContextMenu={handleContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {contextMenuPosition && (
        <ContextMenu
          position={contextMenuPosition}
          items={contextMenuItems}
          onClose={handleCloseContextMenu}
        />
      )}
    </Panel>
  );
}

export default SceneTree;
