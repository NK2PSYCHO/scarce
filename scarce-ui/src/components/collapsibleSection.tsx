/**
 * @packageDocumentation
 * Titled section whose content can be collapsed and expanded.
 */

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the CollapsibleSection component.
 */
export interface CollapsibleSectionProps {
  /**
   * Section title, shown in the toggle button.
   */
  title: string;

  /**
   * Optional number shown next to the title, such as how many Cairns are inside.
   */
  count?: number;

  /**
   * Optional tooltip for the title, such as a full path.
   */
  tooltip?: string;

  /**
   * Whether the section starts expanded. Defaults to `true`. Later changes to
   * the prop are ignored: the user's own toggling wins.
   */
  defaultOpen?: boolean;

  /**
   * Content shown while the section is expanded. Not rendered while collapsed.
   */
  children: ReactNode;

  /**
   * Optional extra class names merged onto the section.
   */
  className?: string;
}

/**
 * Renders a toggle button (with `aria-expanded`) above its content. The open
 * state lives in the component only; it is not saved anywhere.
 *
 * @param props - See {@link CollapsibleSectionProps}.
 * @returns The rendered section.
 */
export function CollapsibleSection({
  title,
  count,
  tooltip,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        aria-expanded={open}
        title={tooltip}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex w-full cursor-pointer items-baseline gap-1 rounded-sm text-left text-sm font-medium focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span aria-hidden="true" className="w-3 shrink-0 text-xs">
          {open ? '▾' : '▸'}
        </span>
        <span className="min-w-0 break-all">{title}</span>{' '}
        {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
      </button>
      {open && <div className="flex flex-col gap-2 pl-2">{children}</div>}
    </section>
  );
}
