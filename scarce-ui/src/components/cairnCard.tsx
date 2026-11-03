/**
 * @packageDocumentation
 * Card showing a single Cairn: location, severity, comment and snippet.
 */

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import type { Cairn } from '@models/cairn';
import { SeverityBadge } from '@/components/severityBadge';
import { SnippetBlock } from '@/components/snippetBlock';
import { cn } from '@/lib/utils';

/**
 * Props for the CairnCard component.
 */
export interface CairnCardProps {
  /**
   * Cairn to display.
   */
  cairn: Cairn;

  /**
   * Callback invoked when the user clicks the card, or presses Enter or Space on
   * it, anywhere except the snippet and the actions slot.
   */
  onNavigate: (cairn: Cairn) => void;

  /**
   * Optional buttons rendered at the right of the header, such as edit and
   * delete. Clicks inside this slot never trigger navigation.
   */
  actions?: ReactNode;

  /**
   * Optional extra class names merged onto the card.
   */
  className?: string;
}

/**
 * Splits a forward-slash relative path into its directory and file name.
 *
 * @param filePath - Path relative to the root folder, using forward slashes.
 * @returns The directory (empty when the file sits at the root) and the file name.
 */
function splitPath(filePath: string): { dir: string; name: string } {
  const index = filePath.lastIndexOf('/');
  if (index === -1) {
    return { dir: '', name: filePath };
  }
  return { dir: filePath.slice(0, index), name: filePath.slice(index + 1) };
}

/**
 * Formats a 0-indexed line range as a 1-indexed label.
 *
 * @param lineRange - Start and end line, 0-indexed and inclusive.
 * @returns `Line 5` for a single line, otherwise `Lines 5–8`.
 */
function formatLineRange([start, end]: [number, number]): string {
  return start === end ? `Line ${start + 1}` : `Lines ${start + 1}–${end + 1}`;
}

/**
 * Renders one Cairn. Clicking the card (or pressing Enter or Space while it is
 * focused) calls onNavigate. The snippet block expands on click without
 * navigating, and the actions slot swallows clicks so its buttons do not
 * navigate either. The directory is truncated from the left so the file name
 * stays visible in a narrow sidebar.
 *
 * @param props - See {@link CairnCardProps}.
 * @returns The rendered card.
 */
export function CairnCard({ cairn, onNavigate, actions, className }: CairnCardProps) {
  const { dir, name } = splitPath(cairn.filePath);
  const lineLabel = formatLineRange(cairn.lineRange);

  const handleKeyDown = (event: KeyboardEvent) => {
    // Ignore keys pressed on inner controls (snippet, action buttons).
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onNavigate(cairn);
    }
  };

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <article
      tabIndex={0}
      aria-label={`Cairn in ${cairn.filePath}, ${lineLabel}`}
      onClick={() => {
        onNavigate(cairn);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex cursor-pointer flex-col gap-2 rounded-sm border border-border p-2',
        'hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <header className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1" title={cairn.filePath}>
          <div className="flex items-baseline gap-1">
            <span className="shrink-0 text-sm font-medium">{name}</span>
            {dir && (
              <span className="min-w-0 truncate text-left text-xs text-muted-foreground [direction:rtl]">
                <bdi>{dir}</bdi>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={cairn.severity} />
            <span className="text-xs text-muted-foreground">{lineLabel}</span>
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1" onClick={stopPropagation}>
            {actions}
          </div>
        )}
      </header>
      <p className="text-sm break-words whitespace-pre-wrap">{cairn.comment}</p>
      <SnippetBlock snippet={cairn.codeSnippet} />
    </article>
  );
}
