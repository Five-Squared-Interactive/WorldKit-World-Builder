/**
 * useSelectionOutline Hook
 *
 * Provides visual feedback for selected objects using emissive highlight.
 * Subscribes to selectionStore and applies/removes highlights on meshes.
 */

import { useEffect, useRef } from 'react';
import { Mesh, MeshStandardMaterial, Color, Material, Object3D } from 'three';
import { useSelectionStore } from '../../../stores';

/** Highlight color for selected objects - bright cyan for visibility */
export const SELECTION_HIGHLIGHT_COLOR = new Color(0x00aaff);

/** Emissive intensity for highlighted objects */
export const SELECTION_HIGHLIGHT_INTENSITY = 0.6;

/**
 * Check if a material supports emissive properties
 */
function isEmissiveMaterial(material: Material | undefined | null): material is MeshStandardMaterial {
  return material != null && 'emissive' in material && 'emissiveIntensity' in material;
}

/**
 * Get materials array from a mesh, filtering out undefined/null values
 */
function getMaterials(mesh: Mesh): Material[] {
  if (!mesh.material) return [];
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.filter((m): m is Material => m != null);
}

/**
 * Apply highlight to an object and all its children (handles GLTF models with nested meshes)
 */
function applyHighlight(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      const materials = getMaterials(child);
      for (const material of materials) {
        if (isEmissiveMaterial(material)) {
          material.emissive.copy(SELECTION_HIGHLIGHT_COLOR);
          material.emissiveIntensity = SELECTION_HIGHLIGHT_INTENSITY;
        }
      }
    }
  });
}

/**
 * Remove highlight from an object and all its children (handles GLTF models with nested meshes)
 */
function removeHighlight(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      const materials = getMaterials(child);
      for (const material of materials) {
        if (isEmissiveMaterial(material)) {
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0;
        }
      }
    }
  });
}

/**
 * Hook for visual selection indicators
 *
 * @param meshMapRef - Ref to the entity-to-object map from useSceneSync
 */
export function useSelectionOutline(
  meshMapRef: React.RefObject<Map<string, Object3D>>
): void {
  const selectedIds = useSelectionStore((state) => state.selectedIds);

  // Track previously highlighted meshes for cleanup
  const highlightedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const meshMap = meshMapRef.current;
    if (!meshMap) return;

    const currentSelectedSet = new Set(selectedIds);
    const previousHighlighted = highlightedIdsRef.current;

    // Remove highlights from deselected meshes
    for (const id of previousHighlighted) {
      if (!currentSelectedSet.has(id)) {
        const mesh = meshMap.get(id);
        if (mesh) {
          removeHighlight(mesh);
        }
      }
    }

    // Add highlights to newly selected meshes
    for (const id of selectedIds) {
      if (!previousHighlighted.has(id)) {
        const mesh = meshMap.get(id);
        if (mesh) {
          applyHighlight(mesh);
        }
      }
    }

    // Update tracked highlighted set
    highlightedIdsRef.current = currentSelectedSet;
  }, [selectedIds, meshMapRef]);

  // Cleanup on unmount - remove all highlights
  useEffect(() => {
    return () => {
      const meshMap = meshMapRef.current;
      if (!meshMap) return;

      for (const id of highlightedIdsRef.current) {
        const mesh = meshMap.get(id);
        if (mesh) {
          removeHighlight(mesh);
        }
      }
    };
  }, [meshMapRef]);
}
