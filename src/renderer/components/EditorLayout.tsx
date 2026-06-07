/**
 * EditorLayout Component
 *
 * Main application layout using resizable panels.
 * Arranges Toolbar, SceneTree, Viewport, PropertiesPanel, and AssetLibrary.
 */

import { useEffect, useState, useCallback } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Toolbar } from '../features/toolbar/Toolbar';
import { SceneTree } from '../features/scene-tree/SceneTree';
import { Viewport } from '../features/viewport/Viewport';
import { PropertiesPanel } from '../features/properties/PropertiesPanel';
import { AssetLibrary } from '../features/asset-library/AssetLibrary';
import { VemlCodePanel, PreviewErrorDialog } from '../features/preview';
import { StatusBar } from './StatusBar';
import {
  NewProjectDialog,
  RecoveryDialog,
  useNewProjectHandler,
  useSaveProject,
  useOpenProject,
  useAutoSave,
} from '../features/project';
import { useProjectStore, useUIStore, PanelId, UIStore } from '../stores';
import { useKeyboardShortcuts, useModelImport } from '../hooks';

/**
 * Resize handle component for horizontal splits
 */
function HorizontalResizeHandle() {
  return (
    <Separator className="resize-handle resize-handle-horizontal">
      <div className="resize-handle-bar" />
    </Separator>
  );
}

/**
 * Resize handle component for vertical splits
 */
function VerticalResizeHandle() {
  return (
    <Separator className="resize-handle resize-handle-vertical">
      <div className="resize-handle-bar" />
    </Separator>
  );
}

/**
 * Main editor layout component
 */
export function EditorLayout() {
  const projectName = useProjectStore((state) => state.metadata.name);
  const isDirty = useProjectStore((state) => state.isDirty);
  const vemlCodePanelVisible = useUIStore(
    (state) => state.panelVisibility[PanelId.VemlCode]
  );
  const togglePanel = useUIStore((state) => state.togglePanel);

  // Recovery dialog state
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [autoSaveTime, setAutoSaveTime] = useState<string | undefined>(undefined);

  // Preview error dialog state
  const previewStatus = useUIStore((state) => state.previewStatus);
  const setPreviewStatus = useUIStore((state) => state.setPreviewStatus);
  const [showPreviewError, setShowPreviewError] = useState(false);
  const [previewErrorMessage, setPreviewErrorMessage] = useState<string>('');

  const handleCloseVemlPanel = useCallback(() => {
    togglePanel(PanelId.VemlCode);
  }, [togglePanel]);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Initialize model import handler (from menu)
  useModelImport();

  // New project dialog state (from store, updated by keyboard shortcuts and menu)
  useNewProjectHandler(); // Register menu event listener
  const isDialogOpen = useUIStore((state: UIStore) => state.newProjectDialogOpen);
  const closeDialog = useUIStore((state: UIStore) => state.closeNewProjectDialog);

  // Save project functionality (listens for menu save triggers)
  useSaveProject();

  // Open project functionality (listens for menu open triggers)
  useOpenProject();

  // Auto-save functionality
  useAutoSave();

  // Check for recovery on mount
  useEffect(() => {
    if (!window.worldkit?.project?.checkRecovery) {
      return;
    }

    window.worldkit.project.checkRecovery().then((result) => {
      if (result.hasRecovery) {
        setAutoSaveTime(result.autoSaveTime);
        setRecoveryDialogOpen(true);
      }
    });
  }, []);

  const handleCloseRecovery = useCallback(() => {
    setRecoveryDialogOpen(false);
  }, []);

  // Handle preview error dialog
  const handleClosePreviewError = useCallback(() => {
    setShowPreviewError(false);
    setPreviewStatus({ state: 'idle' });
  }, [setPreviewStatus]);

  // Show error dialog when preview status is error
  useEffect(() => {
    if (previewStatus.state === 'error' && previewStatus.error) {
      setPreviewErrorMessage(previewStatus.error);
      setShowPreviewError(true);
    }
  }, [previewStatus]);

  // Sync window title with project name
  useEffect(() => {
    const title = isDirty
      ? `WorldKit World Builder - ${projectName} *`
      : `WorldKit World Builder - ${projectName}`;

    // Update window title via IPC
    if (window.worldkit?.window?.setTitle) {
      window.worldkit.window.setTitle(title);
    } else {
      // Fallback for when running outside Electron
      document.title = title;
    }
  }, [projectName, isDirty]);

  return (
    <>
      <div className="editor-layout" data-testid="editor-layout">
        {/* Toolbar - fixed at top */}
        <div className="layout-toolbar">
          <Toolbar />
        </div>

        {/* Main content area with resizable panels */}
        <div className="layout-main">
          <Group orientation="vertical">
            {/* Top section: SceneTree | Viewport | Properties */}
            <Panel minSize={100}>
              <Group orientation="horizontal">
                {/* Left panel: Scene Tree - 240px like original */}
                <Panel defaultSize={240} minSize={100}>
                  <div className="panel-wrapper">
                    <SceneTree />
                  </div>
                </Panel>

                <HorizontalResizeHandle />

                {/* Center panel: Viewport */}
                <Panel minSize={200}>
                  <div className="panel-wrapper panel-wrapper-viewport">
                    <Viewport />
                  </div>
                </Panel>

                <HorizontalResizeHandle />

                {/* Right panel: Properties - 280px like original */}
                <Panel defaultSize={280} minSize={100}>
                  <div className="panel-wrapper">
                    <PropertiesPanel />
                  </div>
                </Panel>
              </Group>
            </Panel>

            <VerticalResizeHandle />

            {/* Bottom panel: Asset Library - 200px like original */}
            <Panel defaultSize={200} minSize={50}>
              <div className="panel-wrapper">
                <AssetLibrary />
              </div>
            </Panel>
          </Group>
        </div>

        {/* VEML Code Panel (floating overlay) */}
        {vemlCodePanelVisible && (
          <div className="layout-veml-code">
            <VemlCodePanel onClose={handleCloseVemlPanel} />
          </div>
        )}

        {/* Status Bar - fixed at bottom */}
        <div className="layout-status-bar">
          <StatusBar />
        </div>
      </div>

      <NewProjectDialog isOpen={isDialogOpen} onClose={closeDialog} />
      <RecoveryDialog
        isOpen={recoveryDialogOpen}
        autoSaveTime={autoSaveTime}
        onClose={handleCloseRecovery}
      />
      <PreviewErrorDialog
        isOpen={showPreviewError}
        error={previewErrorMessage}
        onClose={handleClosePreviewError}
      />
    </>
  );
}

export default EditorLayout;
