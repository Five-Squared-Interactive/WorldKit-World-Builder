/**
 * AssetLibrary Component
 *
 * Displays available assets in a grid with category filtering and search.
 * Assets can be dragged into the scene to add them.
 * Scene entities can be dragged here to create prefabs.
 */

import { useCallback, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Panel } from '../../components/Panel';
import { useAssetStore, useSceneStore } from '../../stores';
import { AssetCategory, createPrefabAsset, isDeletableAsset } from '../../types/asset';
import type { Asset } from '../../types/asset';
import type { Entity } from '../../types/entity';

/**
 * Category display names
 */
const CATEGORY_LABELS: Record<AssetCategory, string> = {
  [AssetCategory.Primitives]: 'Primitives',
  [AssetCategory.Prefabs]: 'Prefabs',
  [AssetCategory.Furniture]: 'Furniture',
  [AssetCategory.Props]: 'Props',
  [AssetCategory.Nature]: 'Nature',
  [AssetCategory.Imported]: 'Imported',
};

/**
 * Get icon for asset type
 */
function getAssetIcon(asset: Asset): string {
  // Prefabs
  if (asset.prefabData) {
    return '📦';
  }
  // Primitives
  switch (asset.primitiveType) {
    case 'cube':
      return '▣';
    case 'sphere':
      return '●';
    case 'cylinder':
      return '⬡';
    case 'plane':
      return '▭';
    case 'capsule':
      return '⬬';
    case 'torus':
      return '◎';
    case 'cone':
      return '▲';
    case 'pyramid':
      return '△';
    case 'tetrahedron':
      return '⟁';
    case 'prism':
      return '⬢';
    case 'arch':
      return '⌒';
    default:
      return '◆';
  }
}

/**
 * Asset thumbnail component
 */
function AssetThumbnail({
  asset,
  onDragStart,
  onDelete,
}: {
  asset: Asset;
  onDragStart: (e: React.DragEvent, asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}) {
  const canDelete = isDeletableAsset(asset);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onDelete(asset);
    },
    [asset, onDelete]
  );

  return (
    <div
      className="asset-thumbnail"
      draggable
      onDragStart={(e) => onDragStart(e, asset)}
      title={asset.name}
      data-testid={`asset-item-${asset.primitiveType || asset.id}`}
    >
      {canDelete && (
        <button
          className="asset-delete-btn"
          onClick={handleDeleteClick}
          title="Delete asset"
          data-testid={`asset-delete-${asset.id}`}
        >
          <Trash2 size={14} />
        </button>
      )}
      <div className="asset-icon">
        {asset.thumbnail ? (
          <img src={asset.thumbnail} alt={asset.name} />
        ) : (
          <span className="primitive-icon">{getAssetIcon(asset)}</span>
        )}
      </div>
      <div className="asset-name">{asset.name}</div>
    </div>
  );
}

/**
 * Confirmation dialog for asset deletion
 */
function DeleteConfirmDialog({
  asset,
  onConfirm,
  onCancel,
}: {
  asset: Asset;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="delete-confirm-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      data-testid="delete-confirm-dialog"
    >
      <div className="delete-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Asset</h3>
        <p>Are you sure you want to delete "{asset.name}"?</p>
        <div className="delete-confirm-buttons">
          <button
            className="cancel-btn"
            onClick={onCancel}
            data-testid="delete-cancel"
          >
            Cancel
          </button>
          <button
            className="delete-btn"
            onClick={onConfirm}
            data-testid="delete-confirm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Collect entity and all descendants recursively
 */
function collectEntityHierarchy(
  entityId: string,
  entities: Record<string, Entity>,
  result: Entity[]
): void {
  const entity = entities[entityId];
  if (!entity) return;

  // Deep clone the entity
  const cloned: Entity = {
    ...entity,
    transform: {
      position: { ...entity.transform.position },
      rotation: { ...entity.transform.rotation },
      scale: { ...entity.transform.scale },
    },
    childIds: [...entity.childIds],
  };

  result.push(cloned);

  // Collect children
  entity.childIds.forEach((childId) => {
    collectEntityHierarchy(childId, entities, result);
  });
}

/**
 * Asset library panel
 */
export function AssetLibrary() {
  const searchQuery = useAssetStore((state) => state.searchQuery);
  const setSearchQuery = useAssetStore((state) => state.setSearchQuery);
  const selectedCategory = useAssetStore((state) => state.selectedCategory);
  const setSelectedCategory = useAssetStore((state) => state.setSelectedCategory);
  const assets = useAssetStore((state) => state.assets);
  const addAsset = useAssetStore((state) => state.addAsset);
  const removeAsset = useAssetStore((state) => state.removeAsset);
  const sceneEntities = useSceneStore((state) => state.entities);

  const [isDragOver, setIsDragOver] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // Memoize filtered assets
  const filteredAssets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return assets.filter((asset) => {
      // Category filter
      if (selectedCategory && asset.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (query) {
        const matchesName = asset.name.toLowerCase().includes(query);
        const matchesTags = asset.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesName && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [assets, selectedCategory, searchQuery]);

  // Get categories that have assets - memoized
  const availableCategories = useMemo(() => {
    const categories = new Set(assets.map((a) => a.category));
    return Array.from(categories);
  }, [assets]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  const handleCategoryClick = useCallback(
    (category: AssetCategory | null) => {
      setSelectedCategory(category);
    },
    [setSelectedCategory]
  );

  const handleDragStart = useCallback((e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/worldkit-asset', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Delete handlers
  const handleDeleteRequest = useCallback((asset: Asset) => {
    setAssetToDelete(asset);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (assetToDelete) {
      removeAsset(assetToDelete.id);
      console.log('[Asset] Deleted asset:', assetToDelete.name);
    }
    setAssetToDelete(null);
  }, [assetToDelete, removeAsset]);

  const handleDeleteCancel = useCallback(() => {
    setAssetToDelete(null);
  }, []);

  // Handle drag over for prefab creation
  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Check if dragging a scene tree node
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('application/x-tree-node')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // Handle drop to create prefab
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const dragDataStr = e.dataTransfer.getData('application/x-tree-node');
      if (!dragDataStr) {
        return;
      }

      const dragData = JSON.parse(dragDataStr) as { id: string; index: number; parentId: string | null };
      const rootEntity = sceneEntities[dragData.id];
      if (!rootEntity) return;

      // Collect entity and all descendants
      const entities: Entity[] = [];
      collectEntityHierarchy(dragData.id, sceneEntities, entities);

      // Generate unique prefab ID
      const prefabId = `prefab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Create the prefab asset
      const prefab = createPrefabAsset(
        prefabId,
        rootEntity.name,
        entities,
        rootEntity.id,
        [rootEntity.type] // Add entity type as tag
      );

      // Add to asset store
      addAsset(prefab);

      console.log('[Prefab] Created prefab:', prefab.name, 'with', entities.length, 'entities');
    },
    [sceneEntities, addAsset]
  );

  return (
    <Panel title="Asset Library" testId="asset-library">
      <div
        className={`asset-library-content ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="asset-search">
          <input
            type="text"
            placeholder="Search assets..."
            className="search-input"
            value={searchQuery}
            onChange={handleSearchChange}
            data-testid="asset-search"
          />
        </div>

        <div className="asset-categories">
          <button
            className={`category-tab ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => handleCategoryClick(null)}
            data-testid="category-all"
          >
            All
          </button>
          {availableCategories.map((category) => (
            <button
              key={category}
              className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category)}
              data-testid={`category-${category}`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        <div className="asset-grid" data-testid="asset-grid">
          {filteredAssets.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? (
                <p>No assets match "{searchQuery}"</p>
              ) : (
                <p>No assets in this category</p>
              )}
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <AssetThumbnail
                key={asset.id}
                asset={asset}
                onDragStart={handleDragStart}
                onDelete={handleDeleteRequest}
              />
            ))
          )}
        </div>

        {/* Delete confirmation dialog */}
        {assetToDelete && (
          <DeleteConfirmDialog
            asset={assetToDelete}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        )}
      </div>
    </Panel>
  );
}

export default AssetLibrary;
