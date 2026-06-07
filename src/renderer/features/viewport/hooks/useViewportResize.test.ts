/**
 * useViewportResize Hook Tests
 *
 * Tests for viewport resize handling with ResizeObserver.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { useViewportResize } from './useViewportResize';

// Helper to create mock DOMRectReadOnly
const createMockContentRect = (width: number, height: number): DOMRectReadOnly => ({
  width,
  height,
  top: 0,
  left: 0,
  bottom: height,
  right: width,
  x: 0,
  y: 0,
  toJSON: () => ({}),
});

// Mock ResizeObserver
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private elements: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve(element: Element) {
    this.elements = this.elements.filter((el) => el !== element);
  }

  disconnect() {
    this.elements = [];
  }

  // Helper to trigger resize
  triggerResize(width: number, height: number) {
    const entry = {
      contentRect: createMockContentRect(width, height),
      target: this.elements[0] || document.createElement('div'),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry;
    this.callback([entry], this);
  }

  static instances: MockResizeObserver[] = [];
  static clear() {
    MockResizeObserver.instances = [];
  }
}

// Mock Three.js camera and renderer
const createMockCamera = () => ({
  aspect: 1,
  updateProjectionMatrix: vi.fn(),
});

const createMockRenderer = () => ({
  setSize: vi.fn(),
});

describe('useViewportResize', () => {
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    MockResizeObserver.clear();
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  describe('initialization', () => {
    it('should create ResizeObserver when all refs are valid', () => {
      const containerRef = {
        current: document.createElement('div'),
      };
      const camera = createMockCamera();
      const renderer = createMockRenderer();

      renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          camera as unknown as THREE.PerspectiveCamera,
          renderer as unknown as THREE.WebGLRenderer
        )
      );

      expect(MockResizeObserver.instances.length).toBe(1);
    });

    it('should not create ResizeObserver when container is null', () => {
      const containerRef = { current: null };
      const camera = createMockCamera();
      const renderer = createMockRenderer();

      renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          camera as unknown as THREE.PerspectiveCamera,
          renderer as unknown as THREE.WebGLRenderer
        )
      );

      expect(MockResizeObserver.instances.length).toBe(0);
    });

    it('should not create ResizeObserver when camera is null', () => {
      const containerRef = {
        current: document.createElement('div'),
      };

      renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          null,
          createMockRenderer() as unknown as THREE.WebGLRenderer
        )
      );

      expect(MockResizeObserver.instances.length).toBe(0);
    });

    it('should not create ResizeObserver when renderer is null', () => {
      const containerRef = {
        current: document.createElement('div'),
      };

      renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          createMockCamera() as unknown as THREE.PerspectiveCamera,
          null
        )
      );

      expect(MockResizeObserver.instances.length).toBe(0);
    });
  });

  describe('resize handling', () => {
    it('should update camera aspect ratio on resize', () => {
      const containerRef = {
        current: document.createElement('div'),
      };
      const camera = createMockCamera();
      const renderer = createMockRenderer();

      renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          camera as unknown as THREE.PerspectiveCamera,
          renderer as unknown as THREE.WebGLRenderer
        )
      );

      // Trigger resize
      MockResizeObserver.instances[0].triggerResize(800, 600);

      expect(camera.aspect).toBe(800 / 600);
      expect(camera.updateProjectionMatrix).toHaveBeenCalled();
    });

    it('should update renderer size on resize', () => {
      const containerRef = {
        current: document.createElement('div'),
      };
      const camera = createMockCamera();
      const renderer = createMockRenderer();

      renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          camera as unknown as THREE.PerspectiveCamera,
          renderer as unknown as THREE.WebGLRenderer
        )
      );

      // Trigger resize
      MockResizeObserver.instances[0].triggerResize(1024, 768);

      expect(renderer.setSize).toHaveBeenCalledWith(1024, 768);
    });

    it('should call onResize callback when provided', () => {
      const containerRef = {
        current: document.createElement('div'),
      };
      const camera = createMockCamera();
      const renderer = createMockRenderer();
      const onResize = vi.fn();

      renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          camera as unknown as THREE.PerspectiveCamera,
          renderer as unknown as THREE.WebGLRenderer,
          onResize
        )
      );

      // Trigger resize
      MockResizeObserver.instances[0].triggerResize(640, 480);

      expect(onResize).toHaveBeenCalledWith(640, 480);
    });

    it('should ignore resize with zero dimensions', () => {
      const containerRef = {
        current: document.createElement('div'),
      };
      const camera = createMockCamera();
      const renderer = createMockRenderer();

      renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          camera as unknown as THREE.PerspectiveCamera,
          renderer as unknown as THREE.WebGLRenderer
        )
      );

      // Trigger resize with zero width
      MockResizeObserver.instances[0].triggerResize(0, 600);

      expect(renderer.setSize).not.toHaveBeenCalled();
      expect(camera.updateProjectionMatrix).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should disconnect ResizeObserver on unmount', () => {
      const containerRef = {
        current: document.createElement('div'),
      };
      const camera = createMockCamera();
      const renderer = createMockRenderer();

      const { unmount } = renderHook(() =>
        useViewportResize(
          containerRef as React.RefObject<HTMLDivElement>,
          camera as unknown as THREE.PerspectiveCamera,
          renderer as unknown as THREE.WebGLRenderer
        )
      );

      const observer = MockResizeObserver.instances[0];
      const disconnectSpy = vi.spyOn(observer, 'disconnect');

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
