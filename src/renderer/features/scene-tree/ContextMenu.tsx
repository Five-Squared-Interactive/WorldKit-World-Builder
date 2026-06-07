/**
 * ContextMenu Component
 *
 * Right-click context menu for scene tree operations.
 * Supports keyboard navigation and displays shortcuts.
 */

import { useEffect, useRef, useState } from 'react';
import styles from './SceneTree.module.css';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuItem {
  type?: 'item' | 'divider';
  label?: string;
  shortcut?: string;
  icon?: string;
  action?: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  position: ContextMenuPosition;
  items: ContextMenuItem[];
  onClose: () => void;
}

/**
 * Context menu component
 */
export function ContextMenu({ position, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(() => {
    // Initialize with first actionable item
    return items.findIndex((item) => item.type !== 'divider' && !item.disabled);
  });

  // Handle click outside and keyboard
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev + 1;
          while (
            next < items.length &&
            (items[next].type === 'divider' || items[next].disabled)
          ) {
            next++;
          }
          return next >= items.length ? prev : next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && (items[next].type === 'divider' || items[next].disabled)) {
            next--;
          }
          return next < 0 ? prev : next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          const item = items[focusedIndex];
          if (item.action && !item.disabled && item.type !== 'divider') {
            item.action();
            onClose();
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [items, focusedIndex, onClose]);

  // Focus menu and adjust position on mount
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    menu.focus();

    // Measure and adjust position to stay within viewport
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    if (x + rect.width > viewportWidth - 8) {
      x = viewportWidth - rect.width - 8;
    }
    if (x < 8) {
      x = 8;
    }
    if (y + rect.height > viewportHeight - 8) {
      y = viewportHeight - rect.height - 8;
    }
    if (y < 8) {
      y = 8;
    }

    // Update position via DOM directly
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [position]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled || item.type === 'divider') return;
    if (item.action) {
      item.action();
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{
        left: position.x,
        top: position.y,
      }}
      role="menu"
      tabIndex={-1}
      data-testid="context-menu"
    >
      {items.map((item, index) => {
        if (item.type === 'divider') {
          return <div key={index} className={styles.contextMenuDivider} role="separator" />;
        }

        const isFocused = focusedIndex === index;

        return (
          <button
            key={index}
            className={`${styles.contextMenuItem} ${
              item.disabled ? styles.contextMenuItemDisabled : ''
            } ${isFocused ? styles.contextMenuItemFocused : ''}`}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => !item.disabled && setFocusedIndex(index)}
            disabled={item.disabled}
            role="menuitem"
            tabIndex={-1}
            data-testid={`context-menu-item-${item.label?.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {item.icon && <span className={styles.contextMenuIcon}>{item.icon}</span>}
            <span className={styles.contextMenuLabel}>{item.label}</span>
            {item.shortcut && (
              <span className={styles.contextMenuShortcut}>{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ContextMenu;
