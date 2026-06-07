/**
 * Panel Component
 *
 * Base component for editor panels (Scene Tree, Properties, Asset Library).
 * Provides consistent styling and header structure.
 */

import { ReactNode } from 'react';

export interface PanelProps {
  /** Panel title displayed in header */
  title: string;
  /** Panel content */
  children: ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Base panel component with header and content area
 */
export function Panel({ title, children, className = '', testId }: PanelProps) {
  return (
    <div className={`panel ${className}`} data-testid={testId}>
      <div className="panel-header">
        <span className="panel-title">{title}</span>
      </div>
      <div className="panel-content">
        {children}
      </div>
    </div>
  );
}

export default Panel;
