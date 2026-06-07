/**
 * Dependency verification module
 * Ensures all required dependencies are properly installed and importable
 */

// Three.js - 3D rendering
import * as THREE from 'three';

// Zustand - State management
import { create } from 'zustand';

// xmlbuilder2 - VEML XML generation
import { create as createXml } from 'xmlbuilder2';

// Export verification info
export const dependencyVersions = {
  three: THREE.REVISION,
  zustand: '5.x', // Zustand doesn't expose version at runtime
  xmlbuilder2: '4.x', // xmlbuilder2 doesn't expose version at runtime
} as const;

// Verify Three.js works
export function verifyThreeJs(): boolean {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  return scene !== null && camera !== null;
}

// Verify Zustand works
interface TestStore {
  count: number;
  increment: () => void;
}

export const useTestStore = create<TestStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Verify xmlbuilder2 works
export function verifyXmlBuilder(): boolean {
  const doc = createXml({ version: '1.0' })
    .ele('veml')
    .ele('metadata')
    .ele('title')
    .txt('Test')
    .up()
    .up()
    .up();
  return doc.end({ prettyPrint: true }).includes('<veml>');
}

// Run all verifications
export function verifyAllDependencies(): boolean {
  return verifyThreeJs() && verifyXmlBuilder();
}
