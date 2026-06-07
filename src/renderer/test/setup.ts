// Test setup file for Vitest
// Configures @testing-library/jest-dom matchers

import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver globally for all tests
// (ResizeObserver is not available in jsdom)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
