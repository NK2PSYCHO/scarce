/**
 * @packageDocumentation
 * Code snippet preview that expands to the full snippet when clicked.
 */

import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';

/**
 * Number of lines shown while the snippet is collapsed.
 */
const DEFAULT_PREVIEW_LINES = 3;

/**
 * Props for the SnippetBlock component.
 */
export interface SnippetBlockProps {
  /**
   * Exact code snippet saved with the Cairn.
   */
  snippet: string;

  /**
   * Number of lines shown while collapsed. Snippets with this many lines or
   * fewer are shown in full and are not expandable.
   */
  previewLines?: number;

  /**
   * Optional extra class names merged onto the block.
   */
  className?: string;
}

/**
 * Shows a code snippet as a collapsed preview that expands to the full snippet
 * on click, Enter or Space, and collapses again the same way. Clicks and key
 * presses on the block never bubble to a parent, so a card that navigates on
 * click does not navigate when the snippet is clicked. Leading indentation is
 * preserved; trailing whitespace is dropped.
 *
 * @param props - See {@link SnippetBlockProps}.
 * @returns The rendered snippet block.
 */
export function SnippetBlock({
  snippet,
  previewLines = DEFAULT_PREVIEW_LINES,
  className,
}: SnippetBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const lines = snippet.replace(/\s+$/, '').split(/\r?\n/);
  const expandable = lines.length > previewLines;
  const hiddenCount = lines.length - previewLines;
  const visibleLines = expandable && !expanded ? lines.slice(0, previewLines) : lines;

  const toggle = () => {
    setExpanded((value) => !value);
  };

  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (expandable) {
      toggle();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!expandable || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    toggle();
  };

  const hint = expanded
    ? 'Show less'
    : `Show ${hiddenCount} more ${hiddenCount === 1 ? 'line' : 'lines'}`;

  return (
    <pre
      {...(expandable && { role: 'button', tabIndex: 0, 'aria-expanded': expanded })}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full overflow-x-auto rounded-sm border border-border bg-muted p-2 text-xs',
        'font-(family-name:--vscode-editor-font-family)',
        expanded && 'max-h-64 overflow-y-auto',
        expandable && 'cursor-pointer',
        className,
      )}
    >
      <code>{visibleLines.join('\n')}</code>
      {expandable && <span className="block pt-1 font-sans text-muted-foreground">{hint}</span>}
    </pre>
  );
}
