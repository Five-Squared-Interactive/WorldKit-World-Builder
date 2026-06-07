/**
 * WorldKit Application Root
 *
 * Main entry point for the WorldKit renderer process.
 * Uses EditorLayout for the main application layout.
 */

import { EditorLayout, CommandDebugPanel } from './components';
import { useNetworkStatus, useWebVerseDetection, useEditMenuHandler, useViewPanelToggleHandler } from './hooks';
import { useNewProjectHandler } from './features/project';
import { useAddPrimitiveHandler } from './features/primitives';
import { useExportHandler, useVemlCodePanelHandler, usePreviewHandler, usePreviewStatus } from './features/preview';
import './styles/global.css';

function App() {
  // Subscribe to network status changes
  useNetworkStatus();

  // Detect WebVerse installation on startup
  useWebVerseDetection();

  // Listen for new project events from menu
  useNewProjectHandler();

  // Listen for add primitive events from menu
  useAddPrimitiveHandler();

  // Listen for export events from menu
  useExportHandler();

  // Listen for VEML code panel toggle events from menu
  useVemlCodePanelHandler();

  // Listen for view panel toggle events from menu (Ctrl+1/2/3)
  useViewPanelToggleHandler();

  // Listen for edit menu events (undo/redo/delete)
  useEditMenuHandler();

  // Listen for preview trigger events from menu (F5)
  usePreviewHandler();

  // Subscribe to preview status changes from main process
  usePreviewStatus();

  return (
    <>
      <EditorLayout />
      <CommandDebugPanel />
    </>
  );
}

export default App;
