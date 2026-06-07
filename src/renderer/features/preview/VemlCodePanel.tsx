/**
 * VEML Code Panel
 *
 * Displays the live VEML output with syntax highlighting.
 * Updates in real-time as the scene changes.
 */

import { useMemo, useState, useCallback } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useProjectStore } from '../../stores/projectStore';
import { serializeToVeml } from '../../services/veml-serializer';
import styles from './VemlCodePanel.module.css';

/**
 * Simple XML syntax highlighter
 * Adds spans with classes for different XML parts
 */
function highlightXml(xml: string): string {
  return xml
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Then add highlighting
    // XML declaration
    .replace(
      /(&lt;\?xml[^?]*\?&gt;)/g,
      '<span class="xml-declaration">$1</span>'
    )
    // Comments
    .replace(
      /(&lt;!--[\s\S]*?--&gt;)/g,
      '<span class="xml-comment">$1</span>'
    )
    // Tags
    .replace(
      /(&lt;\/?)([a-zA-Z][\w-]*)/g,
      '$1<span class="xml-tag">$2</span>'
    )
    // Attributes
    .replace(
      /(\s)([a-zA-Z][\w-]*)(\s*=\s*)/g,
      '$1<span class="xml-attr">$2</span>$3'
    )
    // Attribute values
    .replace(
      /("(?:[^"\\]|\\.)*")/g,
      '<span class="xml-value">$1</span>'
    )
    // Closing brackets
    .replace(
      /(\/?)(&gt;)/g,
      '<span class="xml-bracket">$1$2</span>'
    );
}

interface VemlCodePanelProps {
  onClose?: () => void;
}

export function VemlCodePanel({ onClose }: VemlCodePanelProps) {
  const entities = useSceneStore((state) => state.entities);
  const rootIds = useSceneStore((state) => state.rootIds);
  const metadata = useProjectStore((state) => state.metadata);
  const [copied, setCopied] = useState(false);

  // Generate VEML content
  const vemlContent = useMemo(() => {
    return serializeToVeml(entities, rootIds, {
      name: metadata.name,
      description: metadata.description,
      author: metadata.author,
      includeXmlDeclaration: true,
    });
  }, [entities, rootIds, metadata]);

  // Highlighted HTML
  const highlightedHtml = useMemo(() => {
    return highlightXml(vemlContent);
  }, [vemlContent]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(vemlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [vemlContent]);

  return (
    <div className={styles.panel} data-testid="veml-code-panel">
      <div className={styles.header}>
        <h3 className={styles.title}>VEML Code</h3>
        <div className={styles.actions}>
          <button
            className={styles.copyButton}
            onClick={handleCopy}
            title="Copy to Clipboard"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {onClose && (
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close panel"
            >
              &times;
            </button>
          )}
        </div>
      </div>
      <div className={styles.codeContainer}>
        <pre className={styles.code}>
          <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </pre>
      </div>
      <div className={styles.footer}>
        <span className={styles.lineCount}>
          {vemlContent.split('\n').length} lines
        </span>
      </div>
    </div>
  );
}
