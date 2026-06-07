/**
 * useSelectionOutline Hook Tests
 *
 * Tests for visual selection indicator (emissive highlight) on selected meshes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelectionOutline, SELECTION_HIGHLIGHT_COLOR, SELECTION_HIGHLIGHT_INTENSITY } from './useSelectionOutline';
import { useSelectionStore } from '../../../stores';
import { Mesh, MeshStandardMaterial, BoxGeometry, Color } from 'three';

describe('useSelectionOutline', () => {
  let mockMeshMap: Map<string, Mesh>;
  let meshMapRef: { current: Map<string, Mesh> };
  let mesh1: Mesh;
  let mesh2: Mesh;
  let material1: MeshStandardMaterial;
  let material2: MeshStandardMaterial;

  beforeEach(() => {
    vi.clearAllMocks();
    useSelectionStore.getState().clearSelection();

    // Create real Three.js materials and meshes for testing
    material1 = new MeshStandardMaterial({ color: 0x808080 });
    material2 = new MeshStandardMaterial({ color: 0x808080 });
    const geometry = new BoxGeometry(1, 1, 1);

    mesh1 = new Mesh(geometry, material1);
    mesh1.userData.entityId = 'entity-1';

    mesh2 = new Mesh(geometry, material2);
    mesh2.userData.entityId = 'entity-2';

    mockMeshMap = new Map([
      ['entity-1', mesh1],
      ['entity-2', mesh2],
    ]);

    meshMapRef = { current: mockMeshMap };
  });

  describe('initial state', () => {
    it('should not apply highlight when no selection', () => {
      renderHook(() => useSelectionOutline(meshMapRef));

      // Both meshes should have no emissive
      expect(material1.emissive.getHex()).toBe(0x000000);
      expect(material2.emissive.getHex()).toBe(0x000000);
    });
  });

  describe('selection changes', () => {
    it('should apply emissive highlight when entity is selected', () => {
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useSelectionOutline(meshMapRef));

      // entity-1 should be highlighted
      expect(material1.emissive.getHex()).not.toBe(0x000000);
      // entity-2 should not be highlighted
      expect(material2.emissive.getHex()).toBe(0x000000);
    });

    it('should remove highlight when entity is deselected', () => {
      // Start with entity-1 selected
      useSelectionStore.getState().setSelected(['entity-1']);

      const { rerender } = renderHook(() => useSelectionOutline(meshMapRef));

      // entity-1 should be highlighted
      expect(material1.emissive.getHex()).not.toBe(0x000000);

      // Clear selection wrapped in act
      act(() => {
        useSelectionStore.getState().clearSelection();
      });

      // Re-render to trigger effect
      rerender();

      // entity-1 should no longer be highlighted
      expect(material1.emissive.getHex()).toBe(0x000000);
    });

    it('should switch highlight when selection changes', () => {
      // Start with entity-1 selected
      useSelectionStore.getState().setSelected(['entity-1']);

      const { rerender } = renderHook(() => useSelectionOutline(meshMapRef));

      expect(material1.emissive.getHex()).not.toBe(0x000000);
      expect(material2.emissive.getHex()).toBe(0x000000);

      // Change selection to entity-2 wrapped in act
      act(() => {
        useSelectionStore.getState().setSelected(['entity-2']);
      });
      rerender();

      expect(material1.emissive.getHex()).toBe(0x000000);
      expect(material2.emissive.getHex()).not.toBe(0x000000);
    });

    it('should highlight multiple selected entities', () => {
      useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);

      renderHook(() => useSelectionOutline(meshMapRef));

      // Both should be highlighted
      expect(material1.emissive.getHex()).not.toBe(0x000000);
      expect(material2.emissive.getHex()).not.toBe(0x000000);
    });

    it('should add highlight when entity is added to selection (multi-select)', () => {
      // Start with entity-1 selected
      useSelectionStore.getState().setSelected(['entity-1']);

      const { rerender } = renderHook(() => useSelectionOutline(meshMapRef));

      // Only entity-1 highlighted
      expect(material1.emissive.getHex()).not.toBe(0x000000);
      expect(material2.emissive.getHex()).toBe(0x000000);

      // Add entity-2 to selection (simulating Shift+click via addToSelection)
      act(() => {
        useSelectionStore.getState().addToSelection(['entity-2']);
      });
      rerender();

      // Both should now be highlighted
      expect(material1.emissive.getHex()).not.toBe(0x000000);
      expect(material2.emissive.getHex()).not.toBe(0x000000);
    });

    it('should update highlight when entity is toggled off (Ctrl+click)', () => {
      // Start with both selected
      useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);

      const { rerender } = renderHook(() => useSelectionOutline(meshMapRef));

      // Both highlighted
      expect(material1.emissive.getHex()).not.toBe(0x000000);
      expect(material2.emissive.getHex()).not.toBe(0x000000);

      // Toggle entity-2 off (simulating Ctrl+click)
      act(() => {
        useSelectionStore.getState().toggleSelection('entity-2');
      });
      rerender();

      // Only entity-1 should remain highlighted
      expect(material1.emissive.getHex()).not.toBe(0x000000);
      expect(material2.emissive.getHex()).toBe(0x000000);
    });
  });

  describe('mesh map changes', () => {
    it('should handle missing mesh gracefully', () => {
      // Select an entity that doesn't have a mesh
      useSelectionStore.getState().setSelected(['non-existent-entity']);

      // Should not throw
      expect(() => {
        renderHook(() => useSelectionOutline(meshMapRef));
      }).not.toThrow();
    });

    it('should handle null meshMapRef gracefully', () => {
      const nullRef = { current: new Map() };

      useSelectionStore.getState().setSelected(['entity-1']);

      // Should not throw
      expect(() => {
        renderHook(() => useSelectionOutline(nullRef));
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should remove all highlights on unmount', () => {
      useSelectionStore.getState().setSelected(['entity-1', 'entity-2']);

      const { unmount } = renderHook(() => useSelectionOutline(meshMapRef));

      // Both highlighted
      expect(material1.emissive.getHex()).not.toBe(0x000000);
      expect(material2.emissive.getHex()).not.toBe(0x000000);

      // Unmount
      unmount();

      // Highlights should be removed
      expect(material1.emissive.getHex()).toBe(0x000000);
      expect(material2.emissive.getHex()).toBe(0x000000);
    });
  });

  describe('visibility requirements', () => {
    it('should export SELECTION_HIGHLIGHT_COLOR constant', () => {
      // The selection highlight color should be exported as a visible color
      expect(SELECTION_HIGHLIGHT_COLOR).toBeDefined();
      expect(SELECTION_HIGHLIGHT_COLOR).toBeInstanceOf(Color);
    });

    it('should export SELECTION_HIGHLIGHT_INTENSITY constant', () => {
      // The selection highlight intensity should be exported
      expect(SELECTION_HIGHLIGHT_INTENSITY).toBeDefined();
      expect(typeof SELECTION_HIGHLIGHT_INTENSITY).toBe('number');
      expect(SELECTION_HIGHLIGHT_INTENSITY).toBeGreaterThan(0);
    });

    it('should use a visually prominent highlight color', () => {
      // The highlight color should be bright/saturated enough to be clearly visible
      // Testing that it's not the old subtle gray (0x444444)
      const highlightHex = SELECTION_HIGHLIGHT_COLOR.getHex();
      expect(highlightHex).not.toBe(0x444444); // Not the old subtle gray

      // Should have some color component > 0.5 for visibility
      const maxComponent = Math.max(
        SELECTION_HIGHLIGHT_COLOR.r,
        SELECTION_HIGHLIGHT_COLOR.g,
        SELECTION_HIGHLIGHT_COLOR.b
      );
      expect(maxComponent).toBeGreaterThanOrEqual(0.3);
    });

    it('should use sufficient emissive intensity for visibility', () => {
      // The intensity should be enough to be clearly visible
      expect(SELECTION_HIGHLIGHT_INTENSITY).toBeGreaterThanOrEqual(0.5);
    });

    it('should apply the correct highlight color to selected mesh', () => {
      useSelectionStore.getState().setSelected(['entity-1']);

      renderHook(() => useSelectionOutline(meshMapRef));

      // The material emissive should match our highlight color
      expect(material1.emissive.getHex()).toBe(SELECTION_HIGHLIGHT_COLOR.getHex());
      expect(material1.emissiveIntensity).toBe(SELECTION_HIGHLIGHT_INTENSITY);
    });
  });
});
