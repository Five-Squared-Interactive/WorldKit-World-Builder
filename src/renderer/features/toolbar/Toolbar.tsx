/**
 * Toolbar Component
 *
 * Main application toolbar with tool selection, undo/redo, and preview button.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Move,
  RotateCw,
  Maximize2,
  Box,
  Circle,
  Square,
  Undo2,
  Redo2,
  Magnet,
  Play,
  Loader2,
  Cylinder,
  Cone,
  CircleDot,
  ChevronDown,
} from 'lucide-react';
import { useUIStore, useCommandStore, useSceneStore, useProjectStore, ToolMode } from '../../stores';
import { OfflineIndicator } from '../../components';
import { handleAddPrimitive } from '../primitives';
import {
  WebVerseNotFoundDialog,
  useWebVerseNotFoundDialog,
} from '../preview';
import { serializeToVeml } from '../../services/veml-serializer';

/** Icon size for toolbar buttons */
const ICON_SIZE = 18;

/** Map tool modes to their icons */
const toolIcons: Record<ToolMode, React.ReactNode> = {
  [ToolMode.Select]: <MousePointer2 size={ICON_SIZE} />,
  [ToolMode.Move]: <Move size={ICON_SIZE} />,
  [ToolMode.Rotate]: <RotateCw size={ICON_SIZE} />,
  [ToolMode.Scale]: <Maximize2 size={ICON_SIZE} />,
};

/**
 * Main toolbar component
 */
export function Toolbar() {
  const toolMode = useUIStore((state) => state.toolMode);
  const setToolMode = useUIStore((state) => state.setToolMode);
  const canUndo = useCommandStore((state) => state.undoStack.length > 0);
  const canRedo = useCommandStore((state) => state.redoStack.length > 0);
  const undo = useCommandStore((state) => state.undo);
  const redo = useCommandStore((state) => state.redo);
  const snappingEnabled = useUIStore((state) => state.snappingEnabled);
  const toggleSnapping = useUIStore((state) => state.toggleSnapping);
  const webverseStatus = useUIStore((state) => state.webverseStatus);
  const setWebVerseStatus = useUIStore((state) => state.setWebVerseStatus);
  const entities = useSceneStore((state) => state.entities);
  const rootIds = useSceneStore((state) => state.rootIds);
  const metadata = useProjectStore((state) => state.metadata);
  const previewStatus = useUIStore((state) => state.previewStatus);
  const setPreviewStatus = useUIStore((state) => state.setPreviewStatus);

  // Derive isLaunching from preview status
  const isLaunching = previewStatus.state === 'preparing' || previewStatus.state === 'launching';

  const { isOpen, showDialog, hideDialog } = useWebVerseNotFoundDialog();

  const handlePreviewClick = useCallback(async () => {
    if (!webverseStatus.installed) {
      showDialog();
      return;
    }

    if (isLaunching) return;

    // Set preparing status
    setPreviewStatus({ state: 'preparing' });

    try {
      // Generate VEML content from current scene state
      const vemlContent = serializeToVeml(entities, rootIds, {
        name: metadata.name,
        description: metadata.description,
        author: metadata.author,
        includeXmlDeclaration: true,
      });

      // Launch preview
      const result = await window.worldkit.preview.launch({
        vemlContent,
        projectName: metadata.name,
      });

      if (!result.success) {
        if (result.webverseNotFound) {
          showDialog();
          setPreviewStatus({ state: 'idle' });
        } else {
          setPreviewStatus({
            state: 'error',
            error: result.error || 'Failed to launch preview',
          });
        }
      }
      // Note: On success, the main process will send status updates via onStatusChange
    } catch (error) {
      console.error('Preview launch error:', error);
      setPreviewStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [webverseStatus, entities, rootIds, metadata, showDialog, isLaunching, setPreviewStatus]);

  const handleBrowse = async () => {
    try {
      const result = await window.worldkit.webverse.browse();
      if (result.success && result.path) {
        // Update the store with the new detection result
        const status = await window.worldkit.webverse.getStatus();
        setWebVerseStatus(status);
        hideDialog();
      }
    } catch (error) {
      console.error('Failed to browse for WebVerse:', error);
    }
  };

  return (
    <div className="toolbar" data-testid="toolbar">
      <div className="toolbar-section toolbar-left">
        {/* Brand removed - title shown in window title bar */}
      </div>

      <div className="toolbar-section toolbar-center">
        <div className="tool-group">
          {Object.values(ToolMode).map((mode) => (
            <button
              key={mode}
              className={`tool-button ${toolMode === mode ? 'active' : ''}`}
              onClick={() => setToolMode(mode)}
              title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Tool`}
            >
              {toolIcons[mode]}
            </button>
          ))}
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          <button
            className="tool-button"
            onClick={() => handleAddPrimitive('cube')}
            title="Add Cube (Shift+1)"
            data-testid="add-cube-button"
          >
            <Box size={ICON_SIZE} />
          </button>
          <button
            className="tool-button"
            onClick={() => handleAddPrimitive('sphere')}
            title="Add Sphere (Shift+2)"
            data-testid="add-sphere-button"
          >
            <Circle size={ICON_SIZE} />
          </button>
          <button
            className="tool-button"
            onClick={() => handleAddPrimitive('plane')}
            title="Add Plane (Shift+3)"
            data-testid="add-plane-button"
          >
            <Square size={ICON_SIZE} />
          </button>
          <button
            className="tool-button"
            onClick={() => handleAddPrimitive('cylinder')}
            title="Add Cylinder (Shift+4)"
            data-testid="add-cylinder-button"
          >
            <Cylinder size={ICON_SIZE} />
          </button>
          <button
            className="tool-button"
            onClick={() => handleAddPrimitive('cone')}
            title="Add Cone (Shift+5)"
            data-testid="add-cone-button"
          >
            <Cone size={ICON_SIZE} />
          </button>
          <button
            className="tool-button"
            onClick={() => handleAddPrimitive('torus')}
            title="Add Torus (Shift+6)"
            data-testid="add-torus-button"
          >
            <CircleDot size={ICON_SIZE} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          <button
            className="tool-button"
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            onClick={undo}
            data-testid="undo-button"
          >
            <Undo2 size={ICON_SIZE} />
          </button>
          <button
            className="tool-button"
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            onClick={redo}
            data-testid="redo-button"
          >
            <Redo2 size={ICON_SIZE} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="tool-group">
          <button
            className={`tool-button ${snappingEnabled ? 'active' : ''}`}
            title={`Surface Snapping ${snappingEnabled ? 'On' : 'Off'} (Toggle)`}
            onClick={toggleSnapping}
            data-testid="snap-toggle-button"
          >
            <Magnet size={ICON_SIZE} />
          </button>
        </div>
      </div>

      <div className="toolbar-section toolbar-right">
        <OfflineIndicator />
        <button
          className="preview-button"
          title="Preview in WebVerse (F5)"
          onClick={handlePreviewClick}
          disabled={isLaunching}
          data-testid="preview-button"
        >
          {isLaunching ? (
            <>
              <Loader2 size={16} className="spin" /> Launching...
            </>
          ) : (
            <>
              <Play size={16} /> Preview
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <WebVerseNotFoundDialog onClose={hideDialog} onBrowse={handleBrowse} />
      )}
    </div>
  );
}

export default Toolbar;
