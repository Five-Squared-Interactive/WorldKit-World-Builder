/**
 * CommandDebugPanel Component
 *
 * Debug panel that shows the undo/redo command stacks.
 * Helps identify which actions are being tracked for undo/redo.
 *
 * Toggle with Ctrl+Shift+D
 */

import { useState, useEffect } from 'react';
import { useCommandStore } from '../stores/commandStore';

/**
 * Debug panel showing command history
 */
export function CommandDebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const undoStack = useCommandStore((state) => state.undoStack);
  const redoStack = useCommandStore((state) => state.redoStack);

  // Toggle visibility with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsVisible((v) => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Log command changes to console
  useEffect(() => {
    if (undoStack.length > 0) {
      const lastCommand = undoStack[undoStack.length - 1];
      console.log('[Command] Added to undo stack:', lastCommand.description);
    }
  }, [undoStack.length]);

  if (!isVisible) {
    return null;
  }

  return (
    <div style={styles.panel} data-testid="command-debug-panel">
      <div style={styles.header}>
        <span>Command History (Ctrl+Shift+D to hide)</span>
        <button onClick={() => setIsVisible(false)} style={styles.closeBtn}>×</button>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          Undo Stack ({undoStack.length})
        </div>
        <div style={styles.list}>
          {undoStack.length === 0 ? (
            <div style={styles.empty}>No commands to undo</div>
          ) : (
            [...undoStack].reverse().map((cmd, i) => (
              <div
                key={i}
                style={{
                  ...styles.item,
                  ...(i === 0 ? styles.itemFirst : {}),
                }}
              >
                {i === 0 && <span style={styles.arrow}>→ </span>}
                {cmd.description}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          Redo Stack ({redoStack.length})
        </div>
        <div style={styles.list}>
          {redoStack.length === 0 ? (
            <div style={styles.empty}>No commands to redo</div>
          ) : (
            [...redoStack].reverse().map((cmd, i) => (
              <div
                key={i}
                style={{
                  ...styles.item,
                  ...(i === 0 ? styles.itemFirst : {}),
                }}
              >
                {i === 0 && <span style={styles.arrow}>→ </span>}
                {cmd.description}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.footer}>
        <div>Ctrl+Z = Undo | Ctrl+Y = Redo</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    bottom: 40,
    right: 20,
    width: 320,
    maxHeight: 400,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    border: '1px solid #555',
    borderRadius: 8,
    zIndex: 9999,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#eee',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#444',
    fontWeight: 'bold',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#eee',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  section: {
    padding: '8px 12px',
    borderBottom: '1px solid #444',
  },
  sectionHeader: {
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#aaa',
  },
  list: {
    maxHeight: 120,
    overflowY: 'auto',
  },
  item: {
    padding: '3px 0',
    borderBottom: '1px solid #333',
  },
  itemFirst: {
    color: '#4fc3f7',
    fontWeight: 'bold',
  },
  arrow: {
    color: '#4fc3f7',
  },
  empty: {
    color: '#666',
    fontStyle: 'italic',
    padding: '4px 0',
  },
  footer: {
    padding: '8px 12px',
    color: '#888',
    fontSize: 11,
  },
};

export default CommandDebugPanel;
