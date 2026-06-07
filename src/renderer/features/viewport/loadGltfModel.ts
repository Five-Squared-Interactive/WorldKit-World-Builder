/**
 * GLTF Model Loader
 *
 * Loads GLB/GLTF models using Three.js GLTFLoader.
 * Supports loading from base64 data or file path.
 */

import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Object3D, Box3, Vector3, Group } from 'three';
import type { Entity } from '../../types/entity';

/**
 * Result of loading a GLTF model
 */
export interface LoadGltfResult {
  success: boolean;
  object?: Object3D;
  error?: string;
}

/**
 * Singleton GLTFLoader instance
 */
let gltfLoader: GLTFLoader | null = null;

/**
 * Get or create the GLTFLoader instance
 */
function getLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
  }
  return gltfLoader;
}

/**
 * Load a GLTF model from base64 data
 * @param base64Data - Base64-encoded GLB/GLTF data
 * @param mimeType - MIME type of the data
 * @returns Promise resolving to the loaded object
 */
export async function loadGltfFromBase64(
  base64Data: string,
  mimeType: string = 'model/gltf-binary'
): Promise<LoadGltfResult> {
  const loader = getLoader();

  return new Promise((resolve) => {
    try {
      // Create data URL from base64
      const dataUrl = `data:${mimeType};base64,${base64Data}`;

      loader.load(
        dataUrl,
        (gltf: GLTF) => {
          const object = prepareGltfObject(gltf);
          resolve({ success: true, object });
        },
        undefined, // onProgress not needed for data URLs
        (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to load model';
          resolve({ success: false, error: message });
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load model';
      resolve({ success: false, error: message });
    }
  });
}

/**
 * Load a GLTF model from a file path (via IPC)
 * @param filePath - Absolute path to the GLB/GLTF file
 * @returns Promise resolving to the loaded object
 */
export async function loadGltfFromPath(filePath: string): Promise<LoadGltfResult> {
  try {
    // Read file via IPC
    const result = await window.worldkit.file.readFileBase64(filePath);

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to read file' };
    }

    return loadGltfFromBase64(result.data, result.mimeType);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load model';
    return { success: false, error: message };
  }
}

/**
 * Load a GLTF model for an entity
 * Supports loading from modelData (base64) or modelPath (file path)
 * @param entity - Entity with model data or path
 * @returns Promise resolving to the loaded object
 */
export async function loadGltfForEntity(entity: Entity): Promise<LoadGltfResult> {
  // Prefer modelData if available (faster, no IPC needed)
  if (entity.modelData) {
    return loadGltfFromBase64(entity.modelData);
  }

  // Fall back to loading from file path
  if (entity.modelPath) {
    return loadGltfFromPath(entity.modelPath);
  }

  return { success: false, error: 'No model data or path provided' };
}

/**
 * Prepare a loaded GLTF object for use in the scene
 * - Centers the object
 * - Normalizes scale to a reasonable size
 * - Sets up shadows
 */
function prepareGltfObject(gltf: GLTF): Object3D {
  const scene = gltf.scene;

  // Compute bounding box
  const box = new Box3().setFromObject(scene);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);

  // Normalize to fit within a 2x2x2 unit cube while preserving aspect ratio
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = maxDimension > 0 ? 2 / maxDimension : 1;

  // Create a wrapper group to handle centering and normalization
  const wrapper = new Group();
  wrapper.add(scene);

  // Center the model
  scene.position.sub(center);

  // Apply normalization scale
  wrapper.scale.setScalar(scale);

  // Enable shadows on all meshes
  scene.traverse((child) => {
    if ('isMesh' in child && child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return wrapper;
}

/**
 * Apply entity transform to a loaded GLTF object
 * @param object - The loaded Three.js object
 * @param entity - Entity with transform data
 */
export function applyEntityTransform(object: Object3D, entity: Entity): void {
  object.position.set(
    entity.transform.position.x,
    entity.transform.position.y,
    entity.transform.position.z
  );

  object.quaternion.set(
    entity.transform.rotation.x,
    entity.transform.rotation.y,
    entity.transform.rotation.z,
    entity.transform.rotation.w
  );

  object.scale.set(
    entity.transform.scale.x,
    entity.transform.scale.y,
    entity.transform.scale.z
  );
}
