/**
 * Tray Module Tests
 *
 * Tests for system tray functionality.
 * Note: Full Electron Tray testing requires mocking Electron APIs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auto-update-service
vi.mock('./services/auto-update-service', () => ({
  isUpdateReady: vi.fn().mockReturnValue(false),
  checkForUpdates: vi.fn(),
  quitAndInstall: vi.fn(),
}));

// Mock recent-projects-service
vi.mock('./services/recent-projects-service', () => ({
  getRecentProjects: vi.fn().mockReturnValue([]),
}));

// Mock Electron modules - factory must not reference external variables
vi.mock('electron', () => {
  const mockTrayInstance = {
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  };

  const mockMenuInstance = { items: [] };

  const mockNativeImageInstance = {
    isEmpty: vi.fn().mockReturnValue(true),
    resize: vi.fn().mockReturnThis(),
  };

  const mockFallbackImageInstance = {
    isEmpty: vi.fn().mockReturnValue(false),
  };

  return {
    Tray: vi.fn().mockImplementation(function () {
      return mockTrayInstance;
    }),
    Menu: {
      buildFromTemplate: vi.fn().mockReturnValue(mockMenuInstance),
    },
    nativeImage: {
      createFromPath: vi.fn().mockReturnValue(mockNativeImageInstance),
      createFromBuffer: vi.fn().mockReturnValue(mockFallbackImageInstance),
    },
    app: {
      quit: vi.fn(),
      getAppPath: vi.fn().mockReturnValue('/mock/app/path'),
    },
    BrowserWindow: vi.fn(),
    __mockTrayInstance: mockTrayInstance,
    __mockWindowInstance: {
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn(),
      isVisible: vi.fn().mockReturnValue(true),
      webContents: {
        send: vi.fn(),
      },
    },
  };
});

// Import after mocking
import { createTray, destroyTray, getTray, updateTrayMenu } from './tray';
import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';

// Access the mocks for assertions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronMocks = await vi.importMock<any>('electron');
const mockTrayInstance = electronMocks.__mockTrayInstance;
const mockWindowInstance = electronMocks.__mockWindowInstance;

describe('Tray Module', () => {
  let mockWindow: BrowserWindow;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset tray state
    destroyTray();
    // Create mock window
    mockWindow = mockWindowInstance as unknown as BrowserWindow;
  });

  afterEach(() => {
    destroyTray();
  });

  describe('createTray', () => {
    it('creates a tray with the correct tooltip', () => {
      createTray(mockWindow);

      expect(Tray).toHaveBeenCalled();
      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith(
        'World Builder'
      );
    });

    it('sets up a context menu', () => {
      createTray(mockWindow);

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(mockTrayInstance.setContextMenu).toHaveBeenCalled();
    });

    it('registers click event handler', () => {
      createTray(mockWindow);

      expect(mockTrayInstance.on).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    it('registers double-click event handler', () => {
      createTray(mockWindow);

      expect(mockTrayInstance.on).toHaveBeenCalledWith(
        'double-click',
        expect.any(Function)
      );
    });

    it('attempts to load icon from path first', () => {
      createTray(mockWindow);

      expect(nativeImage.createFromPath).toHaveBeenCalled();
    });

    it('falls back to generated icon when no file exists', () => {
      createTray(mockWindow);

      // Since createFromPath returns empty image, should fall back to buffer
      expect(nativeImage.createFromBuffer).toHaveBeenCalled();
    });
  });

  describe('getTray', () => {
    it('returns null before tray is created', () => {
      expect(getTray()).toBeNull();
    });

    it('returns tray instance after creation', () => {
      createTray(mockWindow);

      expect(getTray()).not.toBeNull();
    });
  });

  describe('destroyTray', () => {
    it('destroys the tray when called', () => {
      createTray(mockWindow);

      destroyTray();

      expect(mockTrayInstance.destroy).toHaveBeenCalled();
      expect(getTray()).toBeNull();
    });

    it('handles being called when no tray exists', () => {
      expect(() => destroyTray()).not.toThrow();
    });
  });

  describe('updateTrayMenu', () => {
    it('updates context menu based on window visibility', () => {
      createTray(mockWindow);
      vi.clearAllMocks();

      updateTrayMenu(mockWindow);

      // Should rebuild menu
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(mockTrayInstance.setContextMenu).toHaveBeenCalled();
    });

    it('does nothing if tray is not created', () => {
      destroyTray();
      vi.clearAllMocks();

      updateTrayMenu(mockWindow);

      expect(Menu.buildFromTemplate).not.toHaveBeenCalled();
    });
  });

  describe('context menu items', () => {
    it('includes New World menu item', () => {
      createTray(mockWindow);

      const buildCalls = vi.mocked(Menu.buildFromTemplate).mock.calls;
      const lastCall = buildCalls[buildCalls.length - 1];
      const menuTemplate = lastCall[0];

      const newWorldItem = menuTemplate.find(
        (item: { label?: string }) => item.label === 'New World'
      );
      expect(newWorldItem).toBeDefined();
    });

    it('includes Open Recent submenu', () => {
      createTray(mockWindow);

      const buildCalls = vi.mocked(Menu.buildFromTemplate).mock.calls;
      const lastCall = buildCalls[buildCalls.length - 1];
      const menuTemplate = lastCall[0];

      const openRecentItem = menuTemplate.find(
        (item: { label?: string }) => item.label === 'Open Recent'
      );
      expect(openRecentItem).toBeDefined();
      expect(openRecentItem.submenu).toBeDefined();
    });

    it('includes Hide World Builder menu item when window is visible', () => {
      createTray(mockWindow);

      const buildCalls = vi.mocked(Menu.buildFromTemplate).mock.calls;
      const lastCall = buildCalls[buildCalls.length - 1];
      const menuTemplate = lastCall[0];

      // Window is visible by default in mock, so menu shows "Hide World Builder"
      const hideItem = menuTemplate.find(
        (item: { label?: string }) => item.label === 'Hide World Builder'
      );
      expect(hideItem).toBeDefined();
    });

    it('includes Show World Builder menu item when window is hidden', () => {
      // First create the tray (which sets isVisible: true in initial menu)
      createTray(mockWindow);

      // Then update visibility mock and refresh menu
      mockWindowInstance.isVisible.mockReturnValue(false);
      updateTrayMenu(mockWindow);

      const buildCalls = vi.mocked(Menu.buildFromTemplate).mock.calls;
      const lastCall = buildCalls[buildCalls.length - 1];
      const menuTemplate = lastCall[0];

      const showItem = menuTemplate.find(
        (item: { label?: string }) => item.label === 'Show World Builder'
      );
      expect(showItem).toBeDefined();
    });

    it('includes Quit menu item', () => {
      createTray(mockWindow);

      const buildCalls = vi.mocked(Menu.buildFromTemplate).mock.calls;
      const lastCall = buildCalls[buildCalls.length - 1];
      const menuTemplate = lastCall[0];

      const quitItem = menuTemplate.find(
        (item: { label?: string }) => item.label === 'Quit'
      );
      expect(quitItem).toBeDefined();
    });
  });

  describe('menu item click handlers', () => {
    it('New World click shows window and sends IPC message', () => {
      createTray(mockWindow);

      const buildCalls = vi.mocked(Menu.buildFromTemplate).mock.calls;
      const lastCall = buildCalls[buildCalls.length - 1];
      const menuTemplate = lastCall[0];

      const newWorldItem = menuTemplate.find(
        (item: { label?: string }) => item.label === 'New World'
      ) as { click?: () => void };

      expect(newWorldItem?.click).toBeDefined();
      newWorldItem.click?.();

      expect(mockWindowInstance.show).toHaveBeenCalled();
      expect(mockWindowInstance.focus).toHaveBeenCalled();
      expect(mockWindowInstance.webContents.send).toHaveBeenCalledWith(
        'worldkit:project:new'
      );
    });

    it('Quit click calls app.quit', async () => {
      const { app } = await import('electron');
      createTray(mockWindow);

      const buildCalls = vi.mocked(Menu.buildFromTemplate).mock.calls;
      const lastCall = buildCalls[buildCalls.length - 1];
      const menuTemplate = lastCall[0];

      const quitItem = menuTemplate.find(
        (item: { label?: string }) => item.label === 'Quit'
      ) as { click?: () => void };

      expect(quitItem?.click).toBeDefined();
      quitItem.click?.();

      expect(app.quit).toHaveBeenCalled();
    });
  });

  describe('click handlers', () => {
    it('shows and focuses window on click when window is hidden', () => {
      mockWindowInstance.isVisible.mockReturnValue(false);
      createTray(mockWindow);

      // Get the click handler
      const clickHandler = mockTrayInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'click'
      )?.[1] as (() => void) | undefined;

      expect(clickHandler).toBeDefined();
      clickHandler?.();

      expect(mockWindowInstance.show).toHaveBeenCalled();
    });

    it('focuses window on click when window is visible', () => {
      mockWindowInstance.isVisible.mockReturnValue(true);
      createTray(mockWindow);

      // Get the click handler
      const clickHandler = mockTrayInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'click'
      )?.[1] as (() => void) | undefined;

      expect(clickHandler).toBeDefined();
      clickHandler?.();

      expect(mockWindowInstance.focus).toHaveBeenCalled();
    });

    it('shows and focuses window on double-click', () => {
      createTray(mockWindow);

      // Get the double-click handler
      const dblClickHandler = mockTrayInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'double-click'
      )?.[1] as (() => void) | undefined;

      expect(dblClickHandler).toBeDefined();
      dblClickHandler?.();

      expect(mockWindowInstance.show).toHaveBeenCalled();
      expect(mockWindowInstance.focus).toHaveBeenCalled();
    });
  });
});
