/**
 * @packageDocumentation
 * List of Cairn cards, sorted by severity, with an empty state.
 */

import type { ReactNode } from 'react';
import type { Cairn, CairnSeverity } from '@models/cairn';
import { CairnCard } from '@/components/cairnCard';
import { cn } from '@/lib/utils';

/**
 * Props for the CairnList component.
 */
export interface CairnListProps {
  /**
   * Cairns to display. The array is not mutated; the list sorts a copy.
   */
  cairns: Cairn[];

  /**
   * Callback invoked when the user clicks a card to jump to its file and lines.
   */
  onNavigate: (cairn: Cairn) => void;

  /**
   * Optional factory for the buttons shown on each card, such as edit and delete.
   */
  renderActions?: (cairn: Cairn) => ReactNode;

  /**
   * Optional extra class names merged onto the list.
   */
  className?: string;
}

/**
 * Sort rank per severity: lower ranks are shown first.
 */
const SEVERITY_RANK: Record<CairnSeverity, number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

/**
 * Renders Cairns as a vertical list of cards, critical first, then high, then
 * normal. Cairns of the same severity keep their original order. Shows a short
 * hint when there are no Cairns.
 *
 * @param props - See {@link CairnListProps}.
 * @returns The rendered list, or the empty-state message.
 */
export function CairnList({ cairns, onNavigate, renderActions, className }: CairnListProps) {
  if (cairns.length === 0) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        No cairns yet. Select some code and run &quot;Add as Cairn&quot;.
      </p>
    );
  }

  const sorted = [...cairns].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return (
    <ul aria-label="Cairns" className={cn('flex flex-col gap-2', className)}>
      {sorted.map((cairn) => (
        <li key={cairn.id}>
          <CairnCard cairn={cairn} onNavigate={onNavigate} actions={renderActions?.(cairn)} />
        </li>
      ))}
    </ul>
  );
}
