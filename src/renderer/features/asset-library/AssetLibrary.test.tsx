/**
 * AssetLibrary Component Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetLibrary } from './AssetLibrary';
import { useAssetStore } from '../../stores/assetStore';
import { BUNDLED_PRIMITIVES, createPrefabAsset, AssetCategory, AssetSource } from '../../types/asset';
import type { Asset } from '../../types/asset';
import { createEntity, EntityType } from '../../types/entity';

describe('AssetLibrary', () => {
  beforeEach(() => {
    useAssetStore.getState().reset();
  });

  describe('rendering', () => {
    it('should render the asset library panel', () => {
      render(<AssetLibrary />);
      expect(screen.getByTestId('asset-library')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<AssetLibrary />);
      expect(screen.getByTestId('asset-search')).toBeInTheDocument();
    });

    it('should render All category tab', () => {
      render(<AssetLibrary />);
      expect(screen.getByTestId('category-all')).toBeInTheDocument();
    });

    it('should render asset grid', () => {
      render(<AssetLibrary />);
      expect(screen.getByTestId('asset-grid')).toBeInTheDocument();
    });

    it('should render bundled primitive assets', () => {
      render(<AssetLibrary />);

      BUNDLED_PRIMITIVES.forEach((asset) => {
        // Component uses primitiveType for test ID
        const testId = `asset-item-${asset.primitiveType || asset.id}`;
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });
    });

    it('should display asset names', () => {
      render(<AssetLibrary />);

      expect(screen.getByText('Cube')).toBeInTheDocument();
      expect(screen.getByText('Sphere')).toBeInTheDocument();
      expect(screen.getByText('Cylinder')).toBeInTheDocument();
      expect(screen.getByText('Plane')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('should filter assets by search query', () => {
      render(<AssetLibrary />);

      const searchInput = screen.getByTestId('asset-search');
      fireEvent.change(searchInput, { target: { value: 'cube' } });

      expect(screen.getByTestId('asset-item-cube')).toBeInTheDocument();
      expect(screen.queryByTestId('asset-item-sphere')).not.toBeInTheDocument();
    });

    it('should show no results message when search has no matches', () => {
      render(<AssetLibrary />);

      const searchInput = screen.getByTestId('asset-search');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText(/No assets match/)).toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<AssetLibrary />);

      const searchInput = screen.getByTestId('asset-search');
      fireEvent.change(searchInput, { target: { value: 'CUBE' } });

      expect(screen.getByTestId('asset-item-cube')).toBeInTheDocument();
    });

    it('should search by tags', () => {
      render(<AssetLibrary />);

      const searchInput = screen.getByTestId('asset-search');
      fireEvent.change(searchInput, { target: { value: 'ball' } });

      expect(screen.getByTestId('asset-item-sphere')).toBeInTheDocument();
    });
  });

  describe('category filtering', () => {
    it('should show All tab as active by default', () => {
      render(<AssetLibrary />);

      const allTab = screen.getByTestId('category-all');
      expect(allTab).toHaveClass('active');
    });

    it('should show Primitives category tab', () => {
      render(<AssetLibrary />);
      expect(screen.getByTestId('category-primitives')).toBeInTheDocument();
    });

    it('should filter by category when tab clicked', () => {
      render(<AssetLibrary />);

      const primitivesTab = screen.getByTestId('category-primitives');
      fireEvent.click(primitivesTab);

      expect(primitivesTab).toHaveClass('active');
      expect(screen.getByTestId('category-all')).not.toHaveClass('active');
    });

    it('should show all assets when All tab clicked', () => {
      render(<AssetLibrary />);

      // First filter by primitives
      fireEvent.click(screen.getByTestId('category-primitives'));

      // Then click All
      fireEvent.click(screen.getByTestId('category-all'));

      expect(screen.getByTestId('category-all')).toHaveClass('active');
      BUNDLED_PRIMITIVES.forEach((asset) => {
        const testId = `asset-item-${asset.primitiveType || asset.id}`;
        expect(screen.getByTestId(testId)).toBeInTheDocument();
      });
    });
  });

  describe('drag and drop', () => {
    it('should make assets draggable', () => {
      render(<AssetLibrary />);

      const cubeAsset = screen.getByTestId('asset-item-cube');
      expect(cubeAsset).toHaveAttribute('draggable', 'true');
    });

    it('should set correct data on drag start', () => {
      render(<AssetLibrary />);

      const cubeAsset = screen.getByTestId('asset-item-cube');

      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(cubeAsset, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith(
        'application/worldkit-asset',
        expect.stringContaining('primitive-cube')
      );
    });
  });

  describe('empty states', () => {
    it('should show empty message when no assets match search', () => {
      render(<AssetLibrary />);

      fireEvent.change(screen.getByTestId('asset-search'), {
        target: { value: 'xyz123' },
      });

      expect(screen.getByText(/No assets match "xyz123"/)).toBeInTheDocument();
    });
  });

  describe('asset deletion', () => {
    it('should NOT show delete button for primitive assets', () => {
      render(<AssetLibrary />);

      const cubeAsset = screen.getByTestId('asset-item-cube');
      fireEvent.mouseOver(cubeAsset);

      // Delete button should not exist for primitives
      expect(screen.queryByTestId('asset-delete-primitive-cube')).not.toBeInTheDocument();
    });

    it('should show delete button for prefab assets', () => {
      // Add a prefab to the store
      const entity = createEntity('test-entity', 'TestEntity', EntityType.CubeMesh);
      const prefab = createPrefabAsset('test-prefab', 'Test Prefab', [entity], entity.id);
      useAssetStore.getState().addAsset(prefab);

      render(<AssetLibrary />);

      const prefabAsset = screen.getByTestId('asset-item-test-prefab');
      expect(prefabAsset).toBeInTheDocument();

      // Delete button should exist for prefabs
      const deleteButton = screen.getByTestId('asset-delete-test-prefab');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should show delete button for imported assets', () => {
      // Add an imported asset
      const importedAsset: Asset = {
        id: 'imported-model',
        name: 'Imported Model',
        category: AssetCategory.Imported,
        source: AssetSource.Imported,
        tags: ['model'],
        filePath: '/path/to/model.glb',
      };
      useAssetStore.getState().addAsset(importedAsset);

      render(<AssetLibrary />);

      const assetItem = screen.getByTestId('asset-item-imported-model');
      expect(assetItem).toBeInTheDocument();

      // Delete button should exist for imported assets
      const deleteButton = screen.getByTestId('asset-delete-imported-model');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should show confirmation dialog when delete button clicked', async () => {
      // Add a prefab to the store
      const entity = createEntity('test-entity', 'TestEntity', EntityType.CubeMesh);
      const prefab = createPrefabAsset('delete-test-prefab', 'Delete Test Prefab', [entity], entity.id);
      useAssetStore.getState().addAsset(prefab);

      render(<AssetLibrary />);

      const deleteButton = screen.getByTestId('asset-delete-delete-test-prefab');
      fireEvent.click(deleteButton);

      // Confirmation dialog should appear
      expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Asset')).toBeInTheDocument();
      // Check the dialog text contains the asset name
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });

    it('should close dialog when cancel is clicked', async () => {
      // Add a prefab to the store
      const entity = createEntity('test-entity', 'TestEntity', EntityType.CubeMesh);
      const prefab = createPrefabAsset('cancel-test-prefab', 'Cancel Test Prefab', [entity], entity.id);
      useAssetStore.getState().addAsset(prefab);

      render(<AssetLibrary />);

      const deleteButton = screen.getByTestId('asset-delete-cancel-test-prefab');
      fireEvent.click(deleteButton);

      // Dialog should be open
      expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByTestId('delete-cancel');
      fireEvent.click(cancelButton);

      // Dialog should be closed
      expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();

      // Asset should still exist
      expect(screen.getByTestId('asset-item-cancel-test-prefab')).toBeInTheDocument();
    });

    it('should remove asset when delete is confirmed', async () => {
      // Add a prefab to the store
      const entity = createEntity('test-entity', 'TestEntity', EntityType.CubeMesh);
      const prefab = createPrefabAsset('confirm-delete-prefab', 'Confirm Delete Prefab', [entity], entity.id);
      useAssetStore.getState().addAsset(prefab);

      render(<AssetLibrary />);

      // Verify asset exists
      expect(screen.getByTestId('asset-item-confirm-delete-prefab')).toBeInTheDocument();

      const deleteButton = screen.getByTestId('asset-delete-confirm-delete-prefab');
      fireEvent.click(deleteButton);

      // Dialog should be open
      expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();

      // Click confirm
      const confirmButton = screen.getByTestId('delete-confirm');
      fireEvent.click(confirmButton);

      // Dialog should be closed
      expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();

      // Asset should be removed
      expect(screen.queryByTestId('asset-item-confirm-delete-prefab')).not.toBeInTheDocument();
    });

    it('should call removeAsset when delete is confirmed', async () => {
      // Add a prefab to the store
      const entity = createEntity('test-entity', 'TestEntity', EntityType.CubeMesh);
      const prefab = createPrefabAsset('remove-call-prefab', 'Remove Call Prefab', [entity], entity.id);
      useAssetStore.getState().addAsset(prefab);

      const initialAssetCount = useAssetStore.getState().assets.length;

      render(<AssetLibrary />);

      const deleteButton = screen.getByTestId('asset-delete-remove-call-prefab');
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId('delete-confirm');
      fireEvent.click(confirmButton);

      // Store should have one less asset
      expect(useAssetStore.getState().assets.length).toBe(initialAssetCount - 1);
    });
  });
});
